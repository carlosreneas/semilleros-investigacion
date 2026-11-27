package com.semilleros.backend.service;

import com.semilleros.backend.entity.Actividad;
import com.semilleros.backend.entity.Capacitacion;
import com.semilleros.backend.entity.GrupoInvestigacion;
import com.semilleros.backend.entity.Integrante;
import com.semilleros.backend.entity.Linea;
import com.semilleros.backend.entity.Producto;
import com.semilleros.backend.entity.Semillero;
import com.semilleros.backend.exception.BusinessException;
import com.semilleros.backend.exception.ResourceNotFoundException;
import com.semilleros.backend.repository.ActividadRepository;
import com.semilleros.backend.repository.CapacitacionRepository;
import com.semilleros.backend.repository.ProductoRepository;
import com.semilleros.backend.repository.SemilleroRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.w3c.dom.Element;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Genera el formato institucional FO-IN-19 (Plan de Acción Semilleros de Investigación) en Word (.docx)
 * a partir de la plantilla oficial.
 *
 * <p>Solo se diligencian los datos que el sistema ya registra; el resto de campos (líder de la línea,
 * responsables, fechas de ejecución, orador, modalidad de participación, celular del director, firmas)
 * quedan vacíos en el documento para ser diligenciados a mano.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReporteFoIn19Service {

    private static final String TEMPLATE_FILE_NAME = "FO-IN-19 PLAN DE ACCION SEMILLEROS INV V2.docx";
    private static final String TEMPLATE_RESOURCE_PATH = "/templates/" + TEMPLATE_FILE_NAME;
    private static final String TEMPLATE_FALLBACK_PATH = "backend/templates/" + TEMPLATE_FILE_NAME;
    private static final String TEMPLATE_FALLBACK_PATH_2 = "templates/" + TEMPLATE_FILE_NAME;

    private static final Pattern PERIODO_PATTERN = Pattern.compile("^(\\d{4})-([12])$");
    private static final int EXPECTED_TABLES = 6;

    // Tablas de la plantilla (en orden de aparición)
    private static final int T_INFO_GENERAL = 0;
    private static final int T_LINEA_PROYECTO = 1;
    private static final int T_PLAN = 2;
    private static final int T_CAPACITACIONES = 3;
    private static final int T_OTRAS_ACTIVIDADES = 4;
    private static final int T_FIRMAS = 5;

    // Primera fila de datos (base 0) de cada tabla con filas repetibles
    private static final int PLAN_FIRST_ROW = 2;
    private static final int CAPACITACIONES_FIRST_ROW = 2;
    private static final int OTRAS_ACTIVIDADES_FIRST_ROW = 3;

    private final SemilleroRepository semilleroRepository;
    private final CapacitacionRepository capacitacionRepository;
    private final ActividadRepository actividadRepository;
    private final ProductoRepository productoRepository;

    /**
     * @param semilleroId Identificador del semillero.
     * @param periodo     Periodo académico con formato {@code AAAA-1} o {@code AAAA-2} (ej. "2025-2").
     * @return Bytes del documento Word generado.
     */
    @Transactional(readOnly = true)
    public byte[] generarReporteFoIn19(Long semilleroId, String periodo) {
        Matcher matcher = PERIODO_PATTERN.matcher(periodo == null ? "" : periodo.trim());
        if (!matcher.matches()) {
            throw new BusinessException("Periodo académico inválido: use el formato AAAA-1 o AAAA-2 (ej. 2025-2)");
        }
        String anio = matcher.group(1);
        boolean primerSemestre = "1".equals(matcher.group(2));

        Semillero semillero = semilleroRepository.findById(semilleroId)
                .orElseThrow(() -> new ResourceNotFoundException("Semillero no encontrado con id: " + semilleroId));

        List<Capacitacion> capacitaciones = capacitacionRepository.findBySemilleroId(semilleroId).stream()
                .sorted(Comparator.comparing(Capacitacion::getFecha, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        List<Actividad> actividades = actividadRepository.findBySemilleroId(semilleroId);
        List<Producto> productos = productoRepository.findBySemilleroId(semilleroId);

        try (InputStream template = openTemplateInputStream()) {
            return DocxFormEditor.edit(template,
                    editor -> rellenar(editor, semillero, anio, primerSemestre, capacitaciones, actividades, productos));
        } catch (IOException e) {
            log.error("Error al generar el formato FO-IN-19 para el semillero {}", semilleroId, e);
            throw new BusinessException("Error al procesar la plantilla Word FO-IN-19: " + e.getMessage());
        }
    }

    private InputStream openTemplateInputStream() throws IOException {
        InputStream stream = getClass().getResourceAsStream(TEMPLATE_RESOURCE_PATH);
        if (stream != null) {
            return stream;
        }

        File file = new File(TEMPLATE_FALLBACK_PATH);
        if (file.exists()) {
            return new FileInputStream(file);
        }

        File file2 = new File(TEMPLATE_FALLBACK_PATH_2);
        if (file2.exists()) {
            return new FileInputStream(file2);
        }

        throw new BusinessException("No se encontró la plantilla de Word FO-IN-19 en el servidor");
    }

    private void rellenar(DocxFormEditor editor, Semillero semillero, String anio, boolean primerSemestre,
                          List<Capacitacion> capacitaciones, List<Actividad> actividades, List<Producto> productos) {
        List<Element> tablas = editor.tables();
        if (tablas.size() != EXPECTED_TABLES) {
            throw new BusinessException("La plantilla FO-IN-19 no tiene la estructura esperada ("
                    + tablas.size() + " tablas en lugar de " + EXPECTED_TABLES + ")");
        }

        List<Producto> proyectos = productos.stream()
                .filter(p -> p.getTipo() != null && p.getTipo().name().contains("PROYECTO"))
                .toList();
        List<Producto> otrosProductos = productos.stream()
                .filter(p -> p.getTipo() == null || !p.getTipo().name().contains("PROYECTO"))
                .toList();

        // Las tablas de datos de la plantilla son flotantes; en línea fluyen bien al crecer con el contenido
        for (int t : new int[]{T_PLAN, T_CAPACITACIONES, T_OTRAS_ACTIVIDADES}) {
            editor.makeInline(tablas.get(t));
        }

        llenarInformacionGeneral(editor, tablas.get(T_INFO_GENERAL), semillero, anio, primerSemestre);
        llenarLineaYProyecto(editor, tablas.get(T_LINEA_PROYECTO), semillero, proyectos);
        llenarPlan(editor, tablas.get(T_PLAN), semillero, otrosProductos);
        llenarCapacitaciones(editor, tablas.get(T_CAPACITACIONES), capacitaciones);
        llenarOtrasActividades(editor, tablas.get(T_OTRAS_ACTIVIDADES), actividades);
        llenarFirmas(editor, tablas.get(T_FIRMAS), semillero);
    }

    private void llenarInformacionGeneral(DocxFormEditor editor, Element tabla, Semillero semillero,
                                          String anio, boolean primerSemestre) {
        List<Element> filas = editor.rows(tabla);
        GrupoInvestigacion grupo = semillero.getGrupoInvestigacion();

        // Fila 0: SEMILLERO DE INVESTIGACIÓN | DIRECTOR
        List<Element> f0 = editor.cells(filas.get(0));
        editor.setText(f0.get(1), semillero.getNombre());
        editor.setText(f0.get(3), semillero.getDirector() != null ? semillero.getDirector().getNombre() : null);

        // Fila 1: CORREO ELECTRÓNICO | CELULAR (el sistema no registra el celular del director)
        List<Element> f1 = editor.cells(filas.get(1));
        editor.setText(f1.get(1), semillero.getDirector() != null ? semillero.getDirector().getCorreo() : null);

        // Fila 2: GRUPO DE INVESTIGACIÓN | DIRECTOR (del grupo)
        List<Element> f2 = editor.cells(filas.get(2));
        editor.setText(f2.get(1), grupo != null ? grupo.getNombre() : null);
        editor.setText(f2.get(3), grupo != null ? grupo.getLider() : null);

        // Fila 3: DEPARTAMENTO | FACULTAD
        List<Element> f3 = editor.cells(filas.get(3));
        editor.setText(f3.get(1), grupo != null ? grupo.getDepartamento() : null);
        editor.setText(f3.get(3), grupo != null ? grupo.getFacultad() : null);

        // Fila 4: SEMESTRE (Primer / Segundo) | AÑO
        List<Element> f4 = editor.cells(filas.get(4));
        editor.setChecked(f4.get(1), primerSemestre ? 0 : 1, true);
        editor.setText(f4.get(3), anio);
    }

    private void llenarLineaYProyecto(DocxFormEditor editor, Element tabla, Semillero semillero,
                                      List<Producto> proyectos) {
        List<Element> filas = editor.rows(tabla);

        String lineas = semillero.getLineas() == null ? "" : semillero.getLineas().stream()
                .map(Linea::getNombre)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .collect(Collectors.joining(", "));
        editor.setText(editor.cells(filas.get(1)).get(1), lineas);          // Línea de Investigación
        // Fila 2: Líder de la línea de Investigación (no se registra)

        editor.setText(editor.cells(filas.get(3)).get(1),                   // Proyecto a Ejecutar
                proyectos.stream().map(Producto::getNombre).collect(Collectors.joining("; ")));

        Set<String> responsables = new LinkedHashSet<>();                    // Responsable del Proyecto
        for (Producto proyecto : proyectos) {
            if (proyecto.getIntegrantes() != null) {
                proyecto.getIntegrantes().stream()
                        .map(Integrante::getNombre)
                        .filter(Objects::nonNull)
                        .sorted(String.CASE_INSENSITIVE_ORDER)
                        .forEach(responsables::add);
            }
        }
        editor.setText(editor.cells(filas.get(4)).get(1), String.join(", ", responsables));
    }

    /** Tabla Objetivo / Actividades / Responsable / Fechas / Producto. */
    private void llenarPlan(DocxFormEditor editor, Element tabla, Semillero semillero, List<Producto> productos) {
        editor.ensureDataRows(tabla, PLAN_FIRST_ROW, Math.max(1, productos.size()));
        List<Element> filas = editor.rows(tabla);

        editor.setText(editor.cells(filas.get(PLAN_FIRST_ROW)).get(0), semillero.getObjetivoGeneral());
        for (int i = 0; i < productos.size(); i++) {
            editor.setText(editor.cells(filas.get(PLAN_FIRST_ROW + i)).get(5), productos.get(i).getNombre());
        }
    }

    private void llenarCapacitaciones(DocxFormEditor editor, Element tabla, List<Capacitacion> capacitaciones) {
        editor.ensureDataRows(tabla, CAPACITACIONES_FIRST_ROW, capacitaciones.size());
        List<Element> filas = editor.rows(tabla);

        for (int i = 0; i < capacitaciones.size(); i++) {
            Capacitacion c = capacitaciones.get(i);
            List<Element> celdas = editor.cells(filas.get(CAPACITACIONES_FIRST_ROW + i));
            editor.setText(celdas.get(0), c.getNombreCapacitacion());
            // celdas 1 (Orador) y 4 (Responsable): no se registran
            editor.setText(celdas.get(2), c.getObjetivoCapacitacion());
            editor.setDate(celdas.get(3), c.getFecha());
            editor.setText(celdas.get(5), c.getCantidadParticipantes() != null
                    ? String.valueOf(c.getCantidadParticipantes())
                    : null);
        }
    }

    private void llenarOtrasActividades(DocxFormEditor editor, Element tabla, List<Actividad> actividades) {
        editor.ensureDataRows(tabla, OTRAS_ACTIVIDADES_FIRST_ROW, actividades.size());
        List<Element> filas = editor.rows(tabla);

        for (int i = 0; i < actividades.size(); i++) {
            Actividad a = actividades.get(i);
            List<Element> celdas = editor.cells(filas.get(OTRAS_ACTIVIDADES_FIRST_ROW + i));
            String tipo = a.getTipoActividad() != null ? a.getTipoActividad().getNombre() : null;
            editor.setText(celdas.get(1), tipo != null && !tipo.isBlank()
                    ? a.getNombre() + " (" + tipo + ")"
                    : a.getNombre());
            // Nombre del proyecto, modalidad, responsable, fecha y producto: no se registran
        }
    }

    private void llenarFirmas(DocxFormEditor editor, Element tabla, Semillero semillero) {
        List<Element> nombres = editor.cells(editor.rows(tabla).get(2));
        // Celdas de la fila: [Nombre, valor, (separador)] x 4 cuadros de firma
        editor.setText(nombres.get(1), semillero.getDirector() != null ? semillero.getDirector().getNombre() : null);
        GrupoInvestigacion grupo = semillero.getGrupoInvestigacion();
        editor.setText(nombres.get(4), grupo != null ? grupo.getLider() : null);
        // Director de Departamento y Representante de la Facultad ante el CCIE: no se registran
    }
}
