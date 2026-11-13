package com.semilleros.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Datos de entrada para registrar o actualizar una actividad de investigación")
public class ActividadRequestDTO {

    @NotNull(message = "El ID del semillero es obligatorio")
    @Schema(description = "Identificador del semillero responsable", example = "1")
    private Long semilleroId;

    @NotNull(message = "El ID del tipo de actividad es obligatorio")
    @Schema(description = "Identificador del tipo de actividad", example = "1")
    private Long tipoActividadId;

    @NotBlank(message = "El nombre de la actividad es obligatorio")
    @Size(max = 255, message = "El nombre no puede superar los 255 caracteres")
    @Schema(description = "Nombre descriptivo de la actividad realizada", example = "Apertura Semana Internacional Ciencia y Tecnología")
    private String nombre;

    @NotNull(message = "El porcentaje de cumplimiento es obligatorio")
    @Min(value = 0, message = "El porcentaje de cumplimiento no puede ser menor a 0")
    @Max(value = 100, message = "El porcentaje de cumplimiento no puede ser mayor a 100")
    @Schema(description = "Porcentaje de cumplimiento de la actividad (0 - 100%)", example = "100")
    private Integer porcentajeCumplimiento;
}

