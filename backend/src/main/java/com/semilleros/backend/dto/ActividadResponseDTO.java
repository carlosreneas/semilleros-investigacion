package com.semilleros.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Datos de respuesta de una actividad de investigación de un semillero")
public class ActividadResponseDTO {

    @Schema(description = "Identificador único de la actividad", example = "1")
    private Long id;

    @Schema(description = "ID del semillero", example = "1")
    private Long semilleroId;

    @Schema(description = "Nombre del semillero", example = "Semillero de Inteligencia Artificial Aplicada")
    private String semilleroNombre;

    @Schema(description = "Sigla del semillero", example = "SIAA")
    private String semilleroSigla;

    @Schema(description = "ID del tipo de actividad", example = "1")
    private Long tipoActividadId;

    @Schema(description = "Nombre del tipo de actividad", example = "Espacio de socialización")
    private String tipoActividadNombre;

    @Schema(description = "Nombre de la actividad", example = "Apertura Semana Internacional Ciencia y Tecnología")
    private String nombre;

    @Schema(description = "Porcentaje de cumplimiento (0 - 100%)", example = "100")
    private Integer porcentajeCumplimiento;
}

