package com.semilleros.backend.service;

import com.semilleros.backend.entity.Integrante;
import com.semilleros.backend.entity.ProgramaAcademico;
import com.semilleros.backend.entity.Semillero;
import com.semilleros.backend.exception.ResourceNotFoundException;
import com.semilleros.backend.repository.IntegranteRepository;
import com.semilleros.backend.repository.SemilleroRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReporteFoIn12ServiceTest {

    @Mock
    private SemilleroRepository semilleroRepository;

    @Mock
    private IntegranteRepository integranteRepository;

    @InjectMocks
    private ReporteFoIn12Service reporteFoIn12Service;

    private static Semillero semillero() {
        return Semillero.builder().id(1L).nombre("Semillero de Pruebas").sigla("SDP").build();
    }

    private static Integrante integrante(String nombre, String codigo, boolean lider) {
        return Integrante.builder()
                .nombre(nombre)
                .codigo(codigo)
                .identificacion("100" + codigo)
                .programa(ProgramaAcademico.builder().nombre("Ingeniería de Sistemas").build())
                .semestreActual(6)
                .fechaNacimiento(LocalDate.now().minusYears(21))
                .direccion("Calle 1 # 2-3")
                .email(codigo + "@ufps.edu.co")
                .celular("3001234567")
                .esLider(lider)
                .build();
    }

    private static String text(Sheet sheet, int row, int col) {
        Row r = sheet.getRow(row);
        Cell c = r != null ? r.getCell(col) : null;
        if (c == null || c.getCellType() == CellType.BLANK) {
            return "";
        }
        return c.getCellType() == CellType.NUMERIC
                ? String.valueOf((int) c.getNumericCellValue())
                : c.getStringCellValue();
    }

    @Test
    void generarReporte_debeLlenarPlantillaConLiderPrimeroYLimpiarFilasSinUso() throws IOException {
        when(semilleroRepository.findById(1L)).thenReturn(Optional.of(semillero()));
        when(integranteRepository.findBySemilleroId(1L)).thenReturn(List.of(
                integrante("Ana Gómez", "1151001", false),
                integrante("Zoe Pérez", "1151002", true),
                integrante("Beto Ruiz", "1151003", false)
        ));

        byte[] bytes = reporteFoIn12Service.generarReporteFoIn12(1L);

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals(2, wb.getNumberOfSheets());
            assertEquals("CONTROL DE CAMBIOS", wb.getSheetAt(1).getSheetName());

            Sheet sheet = wb.getSheetAt(0);
            assertTrue(text(sheet, 8, 1).contains("Semillero de Pruebas (SDP)"));
            assertEquals("FO-IN-12", text(sheet, 1, 47));

            // Fila 13: líder primero, luego orden alfabético
            assertEquals("1", text(sheet, 12, 1));
            assertEquals("Zoe Pérez", text(sheet, 12, 2));
            assertEquals("Ana Gómez", text(sheet, 13, 2));
            assertEquals("Beto Ruiz", text(sheet, 14, 2));

            // Todas las columnas de la fila del líder
            assertEquals("1001151002", text(sheet, 12, 10));
            assertEquals("Ingeniería de Sistemas", text(sheet, 12, 14));
            assertEquals("1151002", text(sheet, 12, 20));
            assertEquals("6", text(sheet, 12, 24));
            assertEquals("21", text(sheet, 12, 27));
            assertEquals("Calle 1 # 2-3", text(sheet, 12, 29));
            assertEquals("1151002@ufps.edu.co", text(sheet, 12, 39));
            assertEquals("3001234567", text(sheet, 12, 45));

            // Estilo uniforme en todas las filas: sin formato de moneda, sin negrita
            for (int row : new int[]{12, 13, 14}) {
                for (int col : new int[]{2, 10, 24, 27, 45}) {
                    assertEquals("General", sheet.getRow(row).getCell(col).getCellStyle().getDataFormatString());
                    assertEquals(false, wb.getFontAt(sheet.getRow(row).getCell(col).getCellStyle().getFontIndex()).getBold());
                }
            }

            // Filas preformateadas sin uso quedan vacías (4..17)
            assertEquals("", text(sheet, 15, 1));
            assertEquals("", text(sheet, 28, 1));
        }
    }

    @Test
    void generarReporte_conMasDe17EstudiantesDebeExtenderLaTablaConFormatoYCeldasCombinadas() throws IOException {
        List<Integrante> muchos = new ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            muchos.add(integrante(String.format("Estudiante %02d", i), String.valueOf(1151000 + i), i == 1));
        }
        when(semilleroRepository.findById(1L)).thenReturn(Optional.of(semillero()));
        when(integranteRepository.findBySemilleroId(1L)).thenReturn(muchos);

        byte[] bytes = reporteFoIn12Service.generarReporteFoIn12(1L);

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = wb.getSheetAt(0);

            // Estudiante 20 en la fila 32 (índice 31)
            assertEquals("20", text(sheet, 31, 1));
            assertEquals("Estudiante 20", text(sheet, 31, 2));
            assertEquals("1151020@ufps.edu.co", text(sheet, 31, 39));

            // Las filas nuevas conservan el estilo de la plantilla y combinan C:J
            assertEquals(
                    sheet.getRow(28).getCell(2).getCellStyle().getBorderBottom(),
                    sheet.getRow(31).getCell(2).getCellStyle().getBorderBottom());
            boolean combinada = sheet.getMergedRegions().stream()
                    .anyMatch(r -> r.getFirstRow() == 31 && r.getFirstColumn() == 2 && r.getLastColumn() == 9);
            assertTrue(combinada);
        }
    }

    @Test
    void generarReporte_sinIntegrantesDebeDejarLaTablaVacia() throws IOException {
        when(semilleroRepository.findById(1L)).thenReturn(Optional.of(semillero()));
        when(integranteRepository.findBySemilleroId(1L)).thenReturn(List.of());

        byte[] bytes = reporteFoIn12Service.generarReporteFoIn12(1L);

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = wb.getSheetAt(0);
            assertEquals("", text(sheet, 12, 1));
            assertEquals("", text(sheet, 28, 1));
        }
    }

    @Test
    void generarReporte_cuandoElSemilleroNoExisteDebeLanzarResourceNotFound() {
        when(semilleroRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> reporteFoIn12Service.generarReporteFoIn12(99L));
    }
}
