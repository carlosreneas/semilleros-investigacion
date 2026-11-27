package com.semilleros.backend.controller;

import com.semilleros.backend.entity.Semillero;
import com.semilleros.backend.exception.ResourceNotFoundException;
import com.semilleros.backend.repository.SemilleroRepository;
import com.semilleros.backend.service.ReporteFoIn12Service;
import com.semilleros.backend.service.ReporteFoIn14Service;
import com.semilleros.backend.service.ReporteFoIn19Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reportes")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Reportes Institucionales", description = "Generación y descarga de formatos institucionales de investigación (PDF, Excel y Word)")
public class ReporteController {

    private static final String XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final String DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private final ReporteFoIn12Service reporteFoIn12Service;
    private final ReporteFoIn14Service reporteFoIn14Service;
    private final ReporteFoIn19Service reporteFoIn19Service;
    private final SemilleroRepository semilleroRepository;

    @Operation(
            summary = "Descargar reporte FO-IN-14 (Informe de Gestión de Semilleros de Investigación)",
            description = "Genera dinámicamente y descarga el archivo PDF del formato institucional FO-IN-14 con base en los datos reales del semillero.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Documento PDF generado exitosamente",
                            content = @Content(mediaType = MediaType.APPLICATION_PDF_VALUE, schema = @Schema(type = "string", format = "binary"))
                    ),
                    @ApiResponse(responseCode = "404", description = "Semillero no encontrado")
            }
    )
    @GetMapping(value = "/semilleros/{id}/fo-in-14", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> descargarReporteFoIn14(
            @Parameter(description = "ID del semillero", required = true) @PathVariable Long id,
            @Parameter(description = "Periodo académico (ej. 2024-1, 2025-1)") @RequestParam(required = false) String periodo
    ) {
        Semillero semillero = semilleroRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semillero no encontrado con ID: " + id));

        String periodoFinal = resolverPeriodo(periodo);

        byte[] pdfBytes = reporteFoIn14Service.generarReporteFoIn14(id, periodoFinal);

        String siglaSanitizada = (semillero.getSigla() != null)
                ? semillero.getSigla().replaceAll("[^a-zA-Z0-9_-]", "_")
                : "SEMILLERO";
        String filename = String.format("FO-IN-14_%s_%s.pdf", siglaSanitizada, periodoFinal);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        headers.setContentLength(pdfBytes.length);

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }

    @Operation(
            summary = "Descargar formato FO-IN-12 (Estudiantes de semilleros que cumplen requerimiento de participación)",
            description = "Genera y descarga el archivo Excel (.xlsx) del formato institucional FO-IN-12 a partir de la plantilla oficial, con los estudiantes inscritos al semillero (el líder aparece primero).",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Archivo Excel generado exitosamente",
                            content = @Content(mediaType = XLSX_MEDIA_TYPE, schema = @Schema(type = "string", format = "binary"))
                    ),
                    @ApiResponse(responseCode = "404", description = "Semillero no encontrado")
            }
    )
    @GetMapping(value = "/semilleros/{id}/fo-in-12", produces = XLSX_MEDIA_TYPE)
    public ResponseEntity<byte[]> descargarReporteFoIn12(
            @Parameter(description = "ID del semillero", required = true) @PathVariable Long id
    ) {
        Semillero semillero = semilleroRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semillero no encontrado con ID: " + id));

        byte[] excelBytes = reporteFoIn12Service.generarReporteFoIn12(id);

        String siglaSanitizada = (semillero.getSigla() != null)
                ? semillero.getSigla().replaceAll("[^a-zA-Z0-9_-]", "_")
                : "SEMILLERO";
        String filename = String.format("FO-IN-12_%s.xlsx", siglaSanitizada);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(XLSX_MEDIA_TYPE));
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        headers.setContentLength(excelBytes.length);

        return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
    }

    @Operation(
            summary = "Descargar formato FO-IN-19 (Plan de Acción Semilleros de Investigación)",
            description = "Genera y descarga el documento Word (.docx) del formato institucional FO-IN-19 a partir de la plantilla oficial, diligenciado con los datos registrados del semillero. Los campos que el sistema no registra quedan vacíos para completarlos a mano.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Documento Word generado exitosamente",
                            content = @Content(mediaType = DOCX_MEDIA_TYPE, schema = @Schema(type = "string", format = "binary"))
                    ),
                    @ApiResponse(responseCode = "404", description = "Semillero no encontrado"),
                    @ApiResponse(responseCode = "409", description = "Periodo académico inválido")
            }
    )
    @GetMapping(value = "/semilleros/{id}/fo-in-19", produces = DOCX_MEDIA_TYPE)
    public ResponseEntity<byte[]> descargarReporteFoIn19(
            @Parameter(description = "ID del semillero", required = true) @PathVariable Long id,
            @Parameter(description = "Periodo académico (ej. 2025-1, 2025-2)") @RequestParam(required = false) String periodo
    ) {
        Semillero semillero = semilleroRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semillero no encontrado con ID: " + id));

        String periodoFinal = resolverPeriodo(periodo);

        byte[] docxBytes = reporteFoIn19Service.generarReporteFoIn19(id, periodoFinal);

        String siglaSanitizada = (semillero.getSigla() != null)
                ? semillero.getSigla().replaceAll("[^a-zA-Z0-9_-]", "_")
                : "SEMILLERO";
        String filename = String.format("FO-IN-19_%s_%s.docx", siglaSanitizada, periodoFinal);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(DOCX_MEDIA_TYPE));
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        headers.setContentLength(docxBytes.length);

        return new ResponseEntity<>(docxBytes, headers, HttpStatus.OK);
    }

    /** Periodo indicado o, si no se envía, el semestre académico actual (ej. 2025-2). */
    private String resolverPeriodo(String periodo) {
        return (periodo != null && !periodo.isBlank())
                ? periodo.trim()
                : String.format("%d-%d", LocalDate.now().getYear(), LocalDate.now().getMonthValue() <= 6 ? 1 : 2);
    }
}
