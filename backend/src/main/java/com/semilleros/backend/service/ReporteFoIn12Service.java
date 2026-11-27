package com.semilleros.backend.service;

import com.semilleros.backend.entity.Integrante;
import com.semilleros.backend.entity.Semillero;
import com.semilleros.backend.exception.BusinessException;
import com.semilleros.backend.exception.ResourceNotFoundException;
import com.semilleros.backend.repository.IntegranteRepository;
import com.semilleros.backend.repository.SemilleroRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Genera el formato institucional FO-IN-12 (Estudiantes de semilleros de investigación que cumplieron
 * con el requerimiento de participación) en Excel, a partir de la plantilla oficial.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReporteFoIn12Service {

    private static final String TEMPLATE_FILE_NAME =
            "FO-IN-12 EST SEMILLEROS QUE CUMPLEN REQ PARTICIPACION V1 (3).xlsx";
    private static final String TEMPLATE_RESOURCE_PATH = "/templates/" + TEMPLATE_FILE_NAME;
    private static final String TEMPLATE_FALLBACK_PATH = "backend/templates/" + TEMPLATE_FILE_NAME;
    private static final String TEMPLATE_FALLBACK_PATH_2 = "templates/" + TEMPLATE_FILE_NAME;

    /** Hoja del formato FO-IN-12 (la segunda hoja, "CONTROL DE CAMBIOS", no se modifica). */
    private static final int FORMATO_SHEET_INDEX = 0;

    /** Fila (base 0) con el texto "INFORMACIÓN DE LOS ESTUDIANTES INSCRITOS ACTUALMENTE AL SEMILLERO:". */
    private static final int TITULO_ROW = 8;
    private static final int TITULO_COL = 1;

    /** Primera fila (base 0) de estudiantes: fila 13 de la plantilla. */
    private static final int FIRST_DATA_ROW = 12;
    /** Última fila (base 0) preformateada en la plantilla: fila 29 (17 estudiantes). */
    private static final int LAST_TEMPLATE_ROW = 28;

    /** Rango de columnas (base 0) del formato: B (No.) hasta AX (Celular). */
    private static final int FIRST_COL = 1;
    private static final int LAST_COL = 49;

    // Columna inicial y final (base 0) de cada campo; las celdas están combinadas por fila en la plantilla.
    private static final int[] COL_NO = {1, 1};            // B
    private static final int[] COL_NOMBRE = {2, 9};        // C:J
    private static final int[] COL_IDENTIFICACION = {10, 13}; // K:N
    private static final int[] COL_PROGRAMA = {14, 19};    // O:T
    private static final int[] COL_CODIGO = {20, 23};      // U:X
    private static final int[] COL_SEMESTRE = {24, 26};    // Y:AA
    private static final int[] COL_EDAD = {27, 28};        // AB:AC
    private static final int[] COL_DIRECCION = {29, 38};   // AD:AM
    private static final int[] COL_EMAIL = {39, 44};       // AN:AS
    private static final int[] COL_CELULAR = {45, 49};     // AT:AX
    /** Altura uniforme (en puntos) de las filas de estudiantes: permite dos líneas de texto. */
    private static final float DATA_ROW_HEIGHT = 27.75f;
    private static final short DATA_FONT_SIZE = 10;

    private static final int[][] ALL_COLUMNS = {
            COL_NO, COL_NOMBRE, COL_IDENTIFICACION, COL_PROGRAMA, COL_CODIGO,
            COL_SEMESTRE, COL_EDAD, COL_DIRECCION, COL_EMAIL, COL_CELULAR
    };

    private final SemilleroRepository semilleroRepository;
    private final IntegranteRepository integranteRepository;

    @Transactional(readOnly = true)
    public byte[] generarReporteFoIn12(Long semilleroId) {
        Semillero semillero = semilleroRepository.findById(semilleroId)
                .orElseThrow(() -> new ResourceNotFoundException("Semillero no encontrado con id: " + semilleroId));

        // Líder primero (el formato indica que el primer estudiante del listado es el líder), luego alfabético
        List<Integrante> integrantes = new ArrayList<>(integranteRepository.findBySemilleroId(semilleroId));
        integrantes.sort(
                Comparator.comparing((Integrante i) -> Boolean.TRUE.equals(i.getEsLider()), Comparator.reverseOrder())
                        .thenComparing(Integrante::getNombre, String.CASE_INSENSITIVE_ORDER)
        );

        try (InputStream templateStream = openTemplateInputStream();
             XSSFWorkbook workbook = new XSSFWorkbook(templateStream);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.getSheetAt(FORMATO_SHEET_INDEX);

            llenarTitulo(sheet, semillero);
            llenarEstudiantes(workbook, sheet, integrantes);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            log.error("Error al generar el formato FO-IN-12 para el semillero {}", semilleroId, e);
            throw new BusinessException("Error al procesar la plantilla Excel FO-IN-12: " + e.getMessage());
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

        throw new BusinessException("No se encontró la plantilla de Excel FO-IN-12 en el servidor");
    }

    /** Agrega el nombre del semillero al encabezado "...INSCRITOS ACTUALMENTE AL SEMILLERO:". */
    private void llenarTitulo(Sheet sheet, Semillero semillero) {
        Row row = sheet.getRow(TITULO_ROW);
        Cell cell = row != null ? row.getCell(TITULO_COL) : null;
        if (cell == null) {
            return;
        }
        String base = cell.getStringCellValue() != null ? cell.getStringCellValue().trim() : "";
        String sigla = semillero.getSigla() != null && !semillero.getSigla().isBlank()
                ? " (" + semillero.getSigla() + ")"
                : "";
        cell.setCellValue(base + " " + semillero.getNombre() + sigla);
    }

    private void llenarEstudiantes(XSSFWorkbook workbook, Sheet sheet, List<Integrante> integrantes) {
        int total = integrantes.size();

        // La plantilla trae 17 filas preformateadas: si hay más estudiantes se extiende la tabla
        // clonando el formato (estilos, alto y celdas combinadas) de la última fila de la plantilla.
        if (FIRST_DATA_ROW + total - 1 > LAST_TEMPLATE_ROW) {
            extenderTabla(workbook, sheet, FIRST_DATA_ROW + total - 1);
        }

        // Las filas de ejemplo de la plantilla tienen formatos mezclados (moneda, negrita, colores de fuente);
        // se unifican conservando los bordes originales.
        normalizarEstilosFilasDatos(workbook, sheet, Math.max(LAST_TEMPLATE_ROW, FIRST_DATA_ROW + total - 1));

        for (int i = 0; i < total; i++) {
            Integrante integrante = integrantes.get(i);
            Row row = getOrCreateRow(sheet, FIRST_DATA_ROW + i);

            setNumber(row, COL_NO, i + 1);
            setText(row, COL_NOMBRE, integrante.getNombre());
            setText(row, COL_IDENTIFICACION, integrante.getIdentificacion());
            setText(row, COL_PROGRAMA, integrante.getPrograma() != null ? integrante.getPrograma().getNombre() : null);
            setText(row, COL_CODIGO, integrante.getCodigo());
            setNumber(row, COL_SEMESTRE, integrante.getSemestreActual());
            setNumber(row, COL_EDAD, integrante.getEdad());
            setText(row, COL_DIRECCION, integrante.getDireccion());
            setText(row, COL_EMAIL, integrante.getEmail());
            setText(row, COL_CELULAR, integrante.getCelular());
        }

        // Limpiar las filas preformateadas sin uso para no dejar numeración huérfana (1..17)
        for (int r = FIRST_DATA_ROW + total; r <= LAST_TEMPLATE_ROW; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            for (int[] col : ALL_COLUMNS) {
                Cell cell = row.getCell(col[0]);
                if (cell != null) {
                    cell.setBlank();
                }
            }
        }
    }

    private void normalizarEstilosFilasDatos(XSSFWorkbook workbook, Sheet sheet, int lastRow) {
        Font font = workbook.createFont();
        font.setFontName(workbook.getFontAt(sheet.getRow(FIRST_DATA_ROW).getCell(FIRST_COL).getCellStyle().getFontIndex()).getFontName());
        font.setFontHeightInPoints(DATA_FONT_SIZE);
        font.setBold(false);
        font.setColor(IndexedColors.BLACK.getIndex());

        Map<Integer, CellStyle> cache = new HashMap<>();
        for (int r = FIRST_DATA_ROW; r <= lastRow; r++) {
            Row row = getOrCreateRow(sheet, r);
            row.setHeightInPoints(DATA_ROW_HEIGHT);
            for (int c = FIRST_COL; c <= LAST_COL; c++) {
                Cell cell = getOrCreateCell(row, c);
                CellStyle original = cell.getCellStyle();
                cell.setCellStyle(cache.computeIfAbsent((int) original.getIndex(), k -> {
                    CellStyle style = workbook.createCellStyle();
                    style.cloneStyleFrom(original);
                    style.setFont(font);
                    style.setDataFormat((short) 0); // General: evita formatos de moneda/decimales heredados
                    style.setFillPattern(FillPatternType.NO_FILL);
                    style.setAlignment(HorizontalAlignment.CENTER);
                    style.setVerticalAlignment(VerticalAlignment.CENTER);
                    style.setWrapText(true);
                    return style;
                }));
            }
        }
    }

    private void extenderTabla(XSSFWorkbook workbook, Sheet sheet, int lastRowNeeded) {
        Row sampleRow = sheet.getRow(LAST_TEMPLATE_ROW);
        for (int r = LAST_TEMPLATE_ROW + 1; r <= lastRowNeeded; r++) {
            Row newRow = getOrCreateRow(sheet, r);
            newRow.setHeight(sampleRow.getHeight());
            for (int c = FIRST_COL; c <= LAST_COL; c++) {
                Cell sampleCell = sampleRow.getCell(c);
                Cell newCell = newRow.createCell(c);
                if (sampleCell != null) {
                    newCell.setCellStyle(sampleCell.getCellStyle());
                }
            }
            for (int[] col : ALL_COLUMNS) {
                if (col[0] != col[1]) {
                    sheet.addMergedRegion(new CellRangeAddress(r, r, col[0], col[1]));
                }
            }
        }
        // La plantilla incluye una fila libre debajo de la tabla dentro del área de impresión (A1:AY30)
        workbook.setPrintArea(FORMATO_SHEET_INDEX, 0, LAST_COL + 1, 0, lastRowNeeded + 1);
    }

    private Row getOrCreateRow(Sheet sheet, int rowIndex) {
        Row row = sheet.getRow(rowIndex);
        return row != null ? row : sheet.createRow(rowIndex);
    }

    private Cell getOrCreateCell(Row row, int colIndex) {
        Cell cell = row.getCell(colIndex);
        return cell != null ? cell : row.createCell(colIndex);
    }

    private void setText(Row row, int[] col, String value) {
        Cell cell = getOrCreateCell(row, col[0]);
        if (value == null || value.isBlank()) {
            cell.setBlank();
        } else {
            cell.setCellValue(value);
        }
    }

    private void setNumber(Row row, int[] col, Integer value) {
        Cell cell = getOrCreateCell(row, col[0]);
        if (value == null) {
            cell.setBlank();
        } else {
            cell.setCellValue(value);
        }
    }
}
