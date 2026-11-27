package com.semilleros.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Resultado del envío de correo a los participantes de un semillero de investigación")
public class EnviarCorreoSemilleroResponseDTO {

    @Schema(description = "ID del semillero", example = "1")
    private Long semilleroId;

    @Schema(description = "Sigla del semillero", example = "SIAA")
    private String semilleroSigla;

    @Schema(description = "Nombre del semillero", example = "Semillero de Inteligencia Artificial Aplicada")
    private String semilleroNombre;

    @Schema(description = "Asunto del mensaje enviado", example = "Convocatoria a reunión ordinaria del semillero")
    private String asunto;

    @Schema(description = "Cantidad total de participantes que recibieron el correo", example = "8")
    private int totalDestinatarios;

    @Schema(description = "Listado de direcciones de correo electrónico de los participantes receptores", example = "[\"juan@ufps.edu.co\", \"maria@ufps.edu.co\"]")
    private List<String> destinatarios;

    @Schema(description = "Mensaje descriptivo del resultado del envío", example = "Correo enviado exitosamente a 8 participantes del semillero SIAA.")
    private String mensaje;

    @Schema(description = "Indica si el correo fue despachado mediante un servidor SMTP activo o procesado en modo simulado/desarrollo", example = "true")
    private boolean enviadoPorSmtp;

    @Schema(description = "Fecha y hora del despacho del correo")
    private LocalDateTime fechaEnvio;
}
