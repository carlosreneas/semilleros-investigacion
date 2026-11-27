package com.semilleros.backend.service;

import com.semilleros.backend.entity.Actividad;
import com.semilleros.backend.entity.Capacitacion;
import com.semilleros.backend.entity.Director;
import com.semilleros.backend.entity.GrupoInvestigacion;
import com.semilleros.backend.entity.Integrante;
import com.semilleros.backend.entity.Linea;
import com.semilleros.backend.entity.Producto;
import com.semilleros.backend.entity.Semillero;
import com.semilleros.backend.entity.TipoActividad;
import com.semilleros.backend.entity.TipoProducto;
import com.semilleros.backend.exception.BusinessException;
import com.semilleros.backend.exception.ResourceNotFoundException;
import com.semilleros.backend.repository.ActividadRepository;
import com.semilleros.backend.repository.CapacitacionRepository;
import com.semilleros.backend.repository.ProductoRepository;
import com.semilleros.backend.repository.SemilleroRepository;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReporteFoIn19ServiceTest {

    @Mock
    private SemilleroRepository semilleroRepository;

    @Mock
    private CapacitacionRepository capacitacionRepository;

    @Mock
    private ActividadRepository actividadRepository;

    @Mock
    private ProductoRepository productoRepository;

    @InjectMocks
    private ReporteFoIn19Service reporteFoIn19Service;

    @BeforeAll
    static void relajarLimiteDeCompresionDePoi() {
        // La miniatura (thumbnail.emf) de la plantilla original se comprime tanto que POI la confunde con un "zip bomb"
        ZipSecureFile.setMinInflateRatio(0);
    }

    private static Semillero semillero() {
        return Semillero.builder()
                .id(1L)
                .nombre("Semillero de Inteligencia Artificial")
                .sigla("SIA")
                .objetivoGeneral("Fortalecer la investigación formativa en IA")
                .director(Director.builder().nombre("Dra. Laura Mora").correo("laura@ufps.edu.co").build())
                .grupoInvestigacion(GrupoInvestigacion.builder()
                        .nombre("Grupo GIA")
                        .lider("Dr. Carlos Peña")
                        .departamento("Departamento de Sistemas e Informática")
                        .facultad("Facultad de Ingeniería")
                        .build())
                .lineas(Set.of(Linea.builder().nombre("Aprendizaje automático").build()))
                .build();
    }

    private static Capacitacion capacitacion(int n) {
        return Capacitacion.builder()
                .nombreCapacitacion("Capacitación " + n)
                .fecha(LocalDate.of(2025, 3, n))
                .objetivoCapacitacion("Objetivo de la capacitación " + n)
                .porcentajeCumplimiento(100.0)
                .cantidadParticipantes(10 + n)
                .build();
    }

    private static String documentXml(byte[] docx) throws IOException {
        try (ZipInputStream zin = new ZipInputStream(new ByteArrayInputStream(docx))) {
            ZipEntry entry;
            while ((entry = zin.getNextEntry()) != null) {
                if ("word/document.xml".equals(entry.getName())) {
                    return new String(zin.readAllBytes(), StandardCharsets.UTF_8);
                }
            }
        }
        throw new IllegalStateException("El .docx generado no contiene word/document.xml");
    }

    private static int count(String text, String fragment) {
        int count = 0;
        for (int i = text.indexOf(fragment); i >= 0; i = text.indexOf(fragment, i + fragment.length())) {
            count++;
        }
        return count;
    }

    @Test
    void generarReporte_debeLlenarLosDatosExistentesYMantenerLaPlantilla() throws IOException {
        Producto proyecto = Producto.builder()
                .nombre("Proyecto de visión por computador")
                .descripcion("Desc")
                .tipo(TipoProducto.PROYECTO_IDI_FORMACION)
                .integrantes(Set.of(Integrante.builder().nombre("Ana Gómez").build()))
                .build();
        Producto software = Producto.builder()
                .nombre("Plataforma de analítica")
                .descripcion("Desc")
                .tipo(TipoProducto.SOFTWARE)
                .build();
        Actividad foro = Actividad.builder()
                .nombre("Foro de IA")
                .tipoActividad(TipoActividad.builder().nombre("Foro").build())
                .porcentajeCumplimiento(100)
                .build();

        when(semilleroRepository.findById(1L)).thenReturn(Optional.of(semillero()));
        when(capacitacionRepository.findBySemilleroId(1L)).thenReturn(List.of(capacitacion(2), capacitacion(1)));
        when(actividadRepository.findBySemilleroId(1L)).thenReturn(List.of(foro));
        when(productoRepository.findBySemilleroId(1L)).thenReturn(List.of(proyecto, software));

        byte[] bytes = reporteFoIn19Service.generarReporteFoIn19(1L, "2025-2");
        String xml = documentXml(bytes);

        // El archivo generado es un .docx válido y conserva las 6 tablas de la plantilla
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            assertEquals(6, doc.getTables().size());
        }

        // Información general
        assertTrue(xml.contains("Semillero de Inteligencia Artificial"));
        assertTrue(xml.contains("Dra. Laura Mora"));
        assertTrue(xml.contains("laura@ufps.edu.co"));
        assertTrue(xml.contains("Grupo GIA"));
        assertTrue(xml.contains("Dr. Carlos Peña"));
        assertTrue(xml.contains("Departamento de Sistemas e Informática"));
        assertTrue(xml.contains("Facultad de Ingeniería"));
        assertTrue(xml.contains(">2025<"));

        // Semestre 2025-2: solo la casilla "Segundo" queda marcada
        assertEquals(1, count(xml, "<w14:checked w14:val=\"1\""));
        assertTrue(xml.indexOf("Segundo") < xml.indexOf("<w14:checked w14:val=\"1\""));

        // Línea, proyecto, responsable y objetivo
        assertTrue(xml.contains("Aprendizaje automático"));
        assertTrue(xml.contains("Proyecto de visión por computador"));
        assertTrue(xml.contains("Ana Gómez"));
        assertTrue(xml.contains("Fortalecer la investigación formativa en IA"));
        assertTrue(xml.contains("Plataforma de analítica"));

        // Capacitaciones ordenadas por fecha, con fecha y número de asistentes
        assertTrue(xml.indexOf("Capacitación 1") < xml.indexOf("Capacitación 2"));
        assertTrue(xml.contains("1/03/2025"));
        assertTrue(xml.contains("w:fullDate=\"2025-03-01T00:00:00Z\""));
        assertTrue(xml.contains(">11<"));

        // Otras actividades
        assertTrue(xml.contains("Foro de IA (Foro)"));

        // Se conservan los campos de formulario de la plantilla y las tablas de datos quedan en línea
        assertTrue(xml.contains("FORMTEXT"));
        assertFalse(xml.contains("<w:tblpPr"));
    }

    @Test
    void generarReporte_conMasCapacitacionesQueFilasDebeExtenderLaTabla() throws IOException {
        List<Capacitacion> muchas = new ArrayList<>();
        for (int i = 1; i <= 9; i++) {
            muchas.add(capacitacion(i));
        }
        when(semilleroRepository.findById(1L)).thenReturn(Optional.of(semillero()));
        when(capacitacionRepository.findBySemilleroId(1L)).thenReturn(muchas);
        when(actividadRepository.findBySemilleroId(1L)).thenReturn(List.of());
        when(productoRepository.findBySemilleroId(1L)).thenReturn(List.of());

        byte[] bytes = reporteFoIn19Service.generarReporteFoIn19(1L, "2025-1");
        String xml = documentXml(bytes);

        for (int i = 1; i <= 9; i++) {
            assertTrue(xml.contains("Capacitación " + i), "Falta la capacitación " + i);
        }
        // Las filas nuevas no deben repetir marcadores ni identificadores de párrafo
        assertEquals(count(xml, "w:name=\"_GoBack\""), 1);

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            // Plantilla: 2 filas de encabezado + 6 de datos; con 9 capacitaciones: 2 + 9
            assertEquals(2 + 9, doc.getTables().get(3).getRows().size());
        }
        // Semestre 2025-1: se marca la casilla "Primer"
        assertTrue(xml.indexOf("<w14:checked w14:val=\"1\"") < xml.indexOf("Segundo"));
    }

    @Test
    void generarReporte_sinDatosDebeDejarCamposVaciosSinFallar() throws IOException {
        when(semilleroRepository.findById(1L)).thenReturn(Optional.of(semillero()));
        when(capacitacionRepository.findBySemilleroId(1L)).thenReturn(List.of());
        when(actividadRepository.findBySemilleroId(1L)).thenReturn(List.of());
        when(productoRepository.findBySemilleroId(1L)).thenReturn(List.of());

        byte[] bytes = reporteFoIn19Service.generarReporteFoIn19(1L, "2025-1");

        assertFalse(documentXml(bytes).contains("Capacitación 1"));
    }

    @Test
    void generarReporte_conPeriodoInvalidoDebeLanzarBusinessException() {
        assertThrows(BusinessException.class, () -> reporteFoIn19Service.generarReporteFoIn19(1L, "2025-3"));
        assertThrows(BusinessException.class, () -> reporteFoIn19Service.generarReporteFoIn19(1L, ""));
        assertThrows(BusinessException.class, () -> reporteFoIn19Service.generarReporteFoIn19(1L, null));
    }

    @Test
    void generarReporte_cuandoElSemilleroNoExisteDebeLanzarResourceNotFound() {
        when(semilleroRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> reporteFoIn19Service.generarReporteFoIn19(99L, "2025-1"));
    }
}
