package com.semilleros.backend.service;

import com.semilleros.backend.dto.EnviarCorreoSemilleroRequestDTO;
import com.semilleros.backend.dto.EnviarCorreoSemilleroResponseDTO;
import com.semilleros.backend.entity.Integrante;
import com.semilleros.backend.entity.Semillero;
import com.semilleros.backend.exception.BusinessException;
import com.semilleros.backend.exception.ResourceNotFoundException;
import com.semilleros.backend.repository.IntegranteRepository;
import com.semilleros.backend.repository.SemilleroRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Servicio encargado de la composición y envío de correos electrónicos
 * dirigidos exclusivamente a los participantes que pertenecen a un semillero específico.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CorreoSemilleroService {

    private final SemilleroRepository semilleroRepository;
    private final IntegranteRepository integranteRepository;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${app.mail.from:no-reply@ufps.edu.co}")
    private String defaultFrom;

    /**
     * Envía un correo electrónico únicamente a los integrantes pertenecientes al semillero indicado.
     *
     * @param semilleroId ID del semillero emisor.
     * @param request     Cuerpo con asunto, mensaje y selección opcional de IDs de integrantes.
     * @return Respuesta con el balance del envío (destinatarios, cantidad y confirmación).
     */
    @Transactional(readOnly = true)
    public EnviarCorreoSemilleroResponseDTO enviarCorreoAParticipantes(Long semilleroId, EnviarCorreoSemilleroRequestDTO request) {
        Semillero semillero = semilleroRepository.findById(semilleroId)
                .orElseThrow(() -> new ResourceNotFoundException("Semillero no encontrado con ID: " + semilleroId));

        // Obtener todos los integrantes que pertenecen única y exclusivamente a este semillero
        List<Integrante> integrantesDelSemillero = integranteRepository.findBySemilleroId(semilleroId);

        if (integrantesDelSemillero.isEmpty()) {
            throw new BusinessException("El semillero " + semillero.getSigla() + " no tiene integrantes registrados para recibir correos.");
        }

        // Si el usuario filtró por integrantes específicos, restringir estrictamente a los que pertenezcan a este semillero
        List<Integrante> destinatariosFinales;
        if (request.getIntegranteIds() != null && !request.getIntegranteIds().isEmpty()) {
            Set<Long> idsPermitidos = integrantesDelSemillero.stream()
                    .map(Integrante::getId)
                    .collect(Collectors.toSet());

            destinatariosFinales = integrantesDelSemillero.stream()
                    .filter(i -> request.getIntegranteIds().contains(i.getId()))
                    .toList();

            if (destinatariosFinales.isEmpty()) {
                throw new BusinessException("Ninguno de los participantes seleccionados pertenece al semillero " + semillero.getSigla() + ".");
            }
        } else {
            destinatariosFinales = integrantesDelSemillero;
        }

        // Extraer correos válidos y únicos
        List<String> correos = destinatariosFinales.stream()
                .map(Integrante::getEmail)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(email -> !email.isBlank())
                .distinct()
                .toList();

        if (correos.isEmpty()) {
            throw new BusinessException("Los participantes seleccionados del semillero no tienen correos electrónicos válidos registrados.");
        }

        // Construir asunto formal con la sigla del semillero
        String asuntoFormateado = String.format("[%s] %s", semillero.getSigla(), request.getAsunto().trim());

        // Construir contenido HTML enriquecido
        String contenidoHtml = buildEmailHtml(semillero, request.getMensaje());

        boolean enviadoPorSmtp = false;

        // Si JavaMailSender y el host están configurados, despachar vía SMTP
        if (mailSender != null && mailHost != null && !mailHost.isBlank()) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                helper.setFrom(defaultFrom);
                // Usar copia oculta (BCC) para proteger la privacidad entre los correos de los estudiantes
                helper.setBcc(correos.toArray(new String[0]));
                helper.setSubject(asuntoFormateado);
                helper.setText(request.getMensaje().trim(), contenidoHtml);

                mailSender.send(message);
                enviadoPorSmtp = true;
                log.info("Correo despachado exitosamente vía SMTP a {} integrantes del semillero {}", correos.size(), semillero.getSigla());
            } catch (Exception e) {
                log.warn("No se pudo enviar el correo vía SMTP (servidor {} inaccesible o no configurado): {}. Se procesará en modo simulado/desarrollo.",
                        mailHost, e.getMessage());
                enviadoPorSmtp = false;
            }
        } else {
            log.info("[MODO DESARROLLO] Se simula el despacho de correo a {} integrantes del semillero {}. Asunto: '{}'",
                    correos.size(), semillero.getSigla(), asuntoFormateado);
        }

        String mensajeResultado = enviadoPorSmtp
                ? String.format("Correo enviado exitosamente por SMTP a %d participante(s) del semillero %s.", correos.size(), semillero.getSigla())
                : String.format("Correo procesado exitosamente para %d participante(s) del semillero %s (modo simulación/desarrollo).", correos.size(), semillero.getSigla());

        return EnviarCorreoSemilleroResponseDTO.builder()
                .semilleroId(semillero.getId())
                .semilleroSigla(semillero.getSigla())
                .semilleroNombre(semillero.getNombre())
                .asunto(asuntoFormateado)
                .totalDestinatarios(correos.size())
                .destinatarios(correos)
                .mensaje(mensajeResultado)
                .enviadoPorSmtp(enviadoPorSmtp)
                .fechaEnvio(LocalDateTime.now())
                .build();
    }

    /**
     * Construye una plantilla HTML institucional limpia para el cuerpo del correo.
     */
    private String buildEmailHtml(Semillero semillero, String mensajeUsuario) {
        String directorNombre = (semillero.getDirector() != null && semillero.getDirector().getNombre() != null)
                ? semillero.getDirector().getNombre()
                : "Dirección de Semillero";
        String directorCorreo = (semillero.getDirector() != null && semillero.getDirector().getCorreo() != null)
                ? semillero.getDirector().getCorreo()
                : "";

        String mensajeConSaltos = mensajeUsuario.trim().replace("\n", "<br/>");

        return """
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
                        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                        .header { background: #aa1916; color: #ffffff; padding: 24px; text-align: center; }
                        .header h1 { margin: 0; font-size: 1.25rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                        .header p { margin: 4px 0 0; font-size: 0.88rem; opacity: 0.9; }
                        .body { padding: 28px 24px; font-size: 0.95rem; line-height: 1.6; }
                        .badge { display: inline-block; background: #fce7ea; color: #aa1916; font-weight: 600; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; margin-bottom: 16px; }
                        .message-box { background: #fdf2f4; border-left: 4px solid #aa1916; padding: 16px 20px; border-radius: 4px; margin: 16px 0; font-size: 0.95rem; white-space: pre-wrap; }
                        .footer { background: #f1f5f9; padding: 18px 24px; font-size: 0.78rem; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
                        .footer strong { color: #334155; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Universidad Francisco de Paula Santander</h1>
                            <p>Sistema de Gestión de Semilleros de Investigación</p>
                        </div>
                        <div class="body">
                            <span class="badge">%s · %s</span>
                            <p>Estimado(a) integrante del semillero,</p>
                            <p>Has recibido la siguiente comunicación oficial dirigida a los participantes de <strong>%s</strong>:</p>
                            <div class="message-box">%s</div>
                            <p style="margin-top: 24px; font-size: 0.88rem; color: #475569;">
                                Atentamente,<br/>
                                <strong>%s</strong><br/>
                                <span>%s</span>
                            </p>
                        </div>
                        <div class="footer">
                            <p>Este es un mensaje institucional automático dirigido a los miembros activos del semillero <strong>%s</strong>.</p>
                            <p>© %d Universidad Francisco de Paula Santander - Cúcuta, Colombia</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(
                semillero.getSigla(),
                semillero.getNombre(),
                semillero.getNombre(),
                mensajeConSaltos,
                directorNombre,
                directorCorreo,
                semillero.getSigla(),
                LocalDateTime.now().getYear()
        );
    }
}
