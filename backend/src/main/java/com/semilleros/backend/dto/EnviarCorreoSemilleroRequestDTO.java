package com.semilleros.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Datos para el envío de correo a los participantes de un semillero de investigación")
public class EnviarCorreoSemilleroRequestDTO {

    @NotBlank(message = "El asunto del correo es obligatorio")
    @Size(max = 200, message = "El asunto no puede superar los 200 caracteres")
    @Schema(description = "Asunto del correo electrónico", example = "Convocatoria a reunión ordinaria del semillero", requiredMode = Schema.RequiredMode.REQUIRED)
    private String asunto;

    @NotBlank(message = "El mensaje del correo es obligatorio")
    @Size(max = 10000, message = "El mensaje no puede superar los 10000 caracteres")
    @Schema(description = "Cuerpo o contenido del mensaje a enviar", example = "Estimados semilleristas, se convoca a reunión este viernes a las 4:00 PM en el laboratorio.", requiredMode = Schema.RequiredMode.REQUIRED)
    private String mensaje;

    @Schema(description = "Lista opcional de IDs de los integrantes destinatarios. Solo se admiten y enviarán a los que pertenezcan estrictamente a este semillero. Si se omite o está vacía, se envía a todos los integrantes registrados del semillero.", example = "[1, 2, 3]")
    private List<Long> integranteIds;
}
