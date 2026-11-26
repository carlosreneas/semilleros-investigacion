package com.semilleros.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Datos de entrada para crear o actualizar un semillero")
public class SemilleroRequestDTO {

    @NotBlank(message = "El nombre del semillero es obligatorio")
    @Size(max = 180, message = "El nombre no puede superar los 180 caracteres")
    @Schema(description = "Nombre del semillero de investigación", example = "Semillero de Inteligencia Artificial Aplicada")
    private String nombre;

    @NotBlank(message = "La sigla del semillero es obligatoria")
    @Size(max = 30, message = "La sigla no puede superar los 30 caracteres")
    @Schema(description = "Sigla única del semillero", example = "SIAA")
    private String sigla;

    @NotNull(message = "El ID del grupo de investigación es obligatorio")
    @Schema(description = "Identificador del grupo de investigación de la UFPS al que pertenece", example = "1")
    private Long grupoInvestigacionId;

    @Schema(description = "Misión del semillero", example = "Fomentar la investigación formativa en IA.")
    private String mision;

    @Schema(description = "Visión del semillero", example = "Ser referente regional en proyectos de IA aplicada para 2030.")
    private String vision;

    @Schema(description = "Objetivo general del semillero", example = "Desarrollar soluciones basadas en aprendizaje automático.")
    private String objetivoGeneral;

    @NotNull(message = "El ID del director es obligatorio")
    @Schema(description = "Identificador del director responsable", example = "1")
    private Long directorId;

    @Schema(description = "IDs de las líneas de investigación asociadas al semillero", example = "[1, 2]")
    private Set<Long> lineaIds;

    @Size(max = 500, message = "La URL del logo no puede superar los 500 caracteres")
    @Schema(description = "Ruta o URL del logo del semillero", example = "/uploads/logos/abc123.png")
    private String logoUrl;
}

