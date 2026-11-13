package com.semilleros.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Datos de entrada para crear o actualizar un tipo de actividad")
public class TipoActividadRequestDTO {

    @NotBlank(message = "El nombre del tipo de actividad es obligatorio")
    @Size(max = 160, message = "El nombre no puede superar los 160 caracteres")
    @Schema(description = "Nombre único del tipo de actividad", example = "Espacio de socialización")
    private String nombre;
}
