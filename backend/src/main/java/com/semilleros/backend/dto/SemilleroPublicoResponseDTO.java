package com.semilleros.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Información pública de un semillero de investigación para visitantes")
public class SemilleroPublicoResponseDTO {

    @Schema(description = "Identificador único del semillero", example = "1")
    private Long id;

    @Schema(description = "Nombre completo del semillero", example = "Semillero de Inteligencia Artificial Aplicada")
    private String nombre;

    @Schema(description = "Sigla del semillero", example = "SIAA")
    private String sigla;

    @Schema(description = "Ruta o URL del logo del semillero", example = "/uploads/logos/abc123.png")
    private String logoUrl;

    @Schema(description = "Misión del semillero")
    private String mision;

    @Schema(description = "Visión del semillero")
    private String vision;

    @Schema(description = "Objetivo general del semillero")
    private String objetivoGeneral;

    @Schema(description = "Nombre del director responsable", example = "Dr. Juan Pérez López")
    private String directorNombre;

    @Schema(description = "Correo institucional del director", example = "jperez@ufps.edu.co")
    private String directorCorreo;

    @Schema(description = "Nombre del grupo de investigación al que pertenece")
    private String grupoNombre;

    @Schema(description = "Sigla del grupo de investigación", example = "GISI")
    private String grupoSigla;

    @Schema(description = "Facultad del grupo de investigación")
    private String grupoFacultad;

    @Schema(description = "Categoría Minciencias del grupo", example = "A1")
    private String grupoCategoria;

    @Schema(description = "Sitio web o GrupLAC del grupo de investigación")
    private String grupoSitioWeb;

    @Schema(description = "Líneas de investigación asociadas al semillero")
    private List<LineaResponseDTO> lineas;

    @Schema(description = "Integrantes del semillero (información pública: nombre, rol, programa)")
    private List<IntegrantePublicoDTO> integrantes;

    @Schema(description = "Productos de investigación desarrollados")
    private List<ProductoPublicoDTO> productos;

    @Schema(description = "Capacitaciones realizadas por el semillero")
    private List<CapacitacionPublicoDTO> capacitaciones;

    // ── Clases internas para información pública ──────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Información pública de un integrante del semillero")
    public static class IntegrantePublicoDTO {

        @Schema(description = "Nombre completo del integrante", example = "Carlos Andrés Gómez")
        private String nombre;

        @Schema(description = "Programa académico que cursa", example = "Ingeniería de Sistemas")
        private String programa;

        @Schema(description = "Semestre actual del integrante", example = "5")
        private Integer semestreActual;

        @Schema(description = "Indica si es el líder del semillero", example = "true")
        private Boolean esLider;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Información pública de un producto de investigación")
    public static class ProductoPublicoDTO {

        @Schema(description = "Nombre del producto", example = "Asistente Virtual con IA")
        private String nombre;

        @Schema(description = "Descripción del producto")
        private String descripcion;

        @Schema(description = "Tipo de producto Minciencias", example = "Software")
        private String tipoNombre;

        @Schema(description = "Categoría Minciencias", example = "Desarrollo Tecnológico e Innovación")
        private String tipoCategoria;

        @Schema(description = "Nombres de los integrantes participantes")
        private List<String> participantes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Información pública de una capacitación")
    public static class CapacitacionPublicoDTO {

        @Schema(description = "Nombre de la capacitación")
        private String nombre;

        @Schema(description = "Fecha de realización", example = "2024-03-20")
        private String fecha;

        @Schema(description = "Objetivo de la capacitación")
        private String objetivo;

        @Schema(description = "Número de participantes", example = "28")
        private Integer participantes;
    }
}
