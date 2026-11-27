package com.semilleros.backend.service;

import com.semilleros.backend.dto.EnviarCorreoSemilleroRequestDTO;
import com.semilleros.backend.dto.EnviarCorreoSemilleroResponseDTO;
import com.semilleros.backend.entity.Director;
import com.semilleros.backend.entity.GrupoInvestigacion;
import com.semilleros.backend.entity.Integrante;
import com.semilleros.backend.entity.Semillero;
import com.semilleros.backend.exception.BusinessException;
import com.semilleros.backend.exception.ResourceNotFoundException;
import com.semilleros.backend.repository.IntegranteRepository;
import com.semilleros.backend.repository.SemilleroRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CorreoSemilleroServiceTest {

    @Mock
    private SemilleroRepository semilleroRepository;

    @Mock
    private IntegranteRepository integranteRepository;

    @InjectMocks
    private CorreoSemilleroService correoService;

    private Semillero semilleroMock;
    private Integrante integrante1;
    private Integrante integrante2;

    @BeforeEach
    void setUp() {
        Director director = Director.builder()
                .id(1L)
                .nombre("Dr. Carlos Martínez")
                .correo("carlos@ufps.edu.co")
                .build();

        GrupoInvestigacion grupo = GrupoInvestigacion.builder()
                .id(1L)
                .nombre("Grupo de Ingeniería de Software")
                .sigla("GIDISOFT")
                .build();

        semilleroMock = Semillero.builder()
                .id(1L)
                .nombre("Semillero de Arquitectura Móvil")
                .sigla("SAM")
                .director(director)
                .grupoInvestigacion(grupo)
                .build();

        integrante1 = Integrante.builder()
                .id(10L)
                .semillero(semilleroMock)
                .nombre("Ana Gómez")
                .email("ana@ufps.edu.co")
                .build();

        integrante2 = Integrante.builder()
                .id(20L)
                .semillero(semilleroMock)
                .nombre("Pedro Pérez")
                .email("pedro@ufps.edu.co")
                .build();
    }

    @Test
    @DisplayName("Debe enviar correo a todos los participantes del semillero cuando no se filtran IDs")
    void enviarCorreoAParticipantes_shouldSendToAllMembers_whenNoIdsSpecified() {
        // Arrange
        when(semilleroRepository.findById(1L)).thenReturn(Optional.of(semilleroMock));
        when(integranteRepository.findBySemilleroId(1L)).thenReturn(List.of(integrante1, integrante2));

        EnviarCorreoSemilleroRequestDTO request = EnviarCorreoSemilleroRequestDTO.builder()
                .asunto("Reunión de avance")
                .mensaje("Estimados, nos vemos mañana.")
                .build();

        // Act
        EnviarCorreoSemilleroResponseDTO response = correoService.enviarCorreoAParticipantes(1L, request);

        // Assert
        assertNotNull(response);
        assertEquals(2, response.getTotalDestinatarios());
        assertTrue(response.getDestinatarios().contains("ana@ufps.edu.co"));
        assertTrue(response.getDestinatarios().contains("pedro@ufps.edu.co"));
        assertTrue(response.getAsunto().contains("[SAM]"));
    }

    @Test
    @DisplayName("Debe enviar correo ÚNICAMENTE a los participantes que pertenezcan a este semillero si se pasan IDs")
    void enviarCorreoAParticipantes_shouldFilterAndOnlySendToMembersOfThisSemillero() {
        // Arrange: el semillero solo tiene a integrante1 (id 10) e integrante2 (id 20)
        when(semilleroRepository.findById(1L)).thenReturn(Optional.of(semilleroMock));
        when(integranteRepository.findBySemilleroId(1L)).thenReturn(List.of(integrante1, integrante2));

        // El request incluye id 10 (del semillero) y id 99 (de otro semillero o inválido)
        EnviarCorreoSemilleroRequestDTO request = EnviarCorreoSemilleroRequestDTO.builder()
                .asunto("Aviso individual")
                .mensaje("Mensaje para integrante.")
                .integranteIds(List.of(10L, 99L))
                .build();

        // Act
        EnviarCorreoSemilleroResponseDTO response = correoService.enviarCorreoAParticipantes(1L, request);

        // Assert: solo el integrante 10 de este semillero recibe el correo
        assertEquals(1, response.getTotalDestinatarios());
        assertEquals(List.of("ana@ufps.edu.co"), response.getDestinatarios());
        assertFalse(response.getDestinatarios().contains("otro@ufps.edu.co"));
    }

    @Test
    @DisplayName("Debe lanzar BusinessException si los IDs solicitados no pertenecen al semillero")
    void enviarCorreoAParticipantes_shouldThrowBusinessException_whenSpecifiedIdsDoNotBelongToSemillero() {
        when(semilleroRepository.findById(1L)).thenReturn(Optional.of(semilleroMock));
        when(integranteRepository.findBySemilleroId(1L)).thenReturn(List.of(integrante1, integrante2));

        EnviarCorreoSemilleroRequestDTO request = EnviarCorreoSemilleroRequestDTO.builder()
                .asunto("Aviso")
                .mensaje("Mensaje.")
                .integranteIds(List.of(99L, 100L))
                .build();

        assertThrows(BusinessException.class, () ->
                correoService.enviarCorreoAParticipantes(1L, request));
    }

    @Test
    @DisplayName("Debe lanzar BusinessException si el semillero no tiene integrantes registrados")
    void enviarCorreoAParticipantes_shouldThrowBusinessException_whenSemilleroHasNoMembers() {
        when(semilleroRepository.findById(1L)).thenReturn(Optional.of(semilleroMock));
        when(integranteRepository.findBySemilleroId(1L)).thenReturn(Collections.emptyList());

        EnviarCorreoSemilleroRequestDTO request = EnviarCorreoSemilleroRequestDTO.builder()
                .asunto("Aviso")
                .mensaje("Mensaje.")
                .build();

        assertThrows(BusinessException.class, () ->
                correoService.enviarCorreoAParticipantes(1L, request));
    }

    @Test
    @DisplayName("Debe lanzar ResourceNotFoundException si el semillero no existe")
    void enviarCorreoAParticipantes_shouldThrowResourceNotFoundException_whenSemilleroNotFound() {
        when(semilleroRepository.findById(999L)).thenReturn(Optional.empty());

        EnviarCorreoSemilleroRequestDTO request = EnviarCorreoSemilleroRequestDTO.builder()
                .asunto("Aviso")
                .mensaje("Mensaje.")
                .build();

        assertThrows(ResourceNotFoundException.class, () ->
                correoService.enviarCorreoAParticipantes(999L, request));
    }
}
