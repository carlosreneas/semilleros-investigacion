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
@Schema(description = "Datos de respuesta de un tipo de actividad")
public class TipoActividadResponseDTO {

    @Schema(description = "Identificador único del tipo de actividad", example = "1")
    private Long id;

    @Schema(description = "Nombre del tipo de actividad", example = "Espacio de socialización")
    private String nombre;
}
