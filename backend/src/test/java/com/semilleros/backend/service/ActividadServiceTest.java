package com.semilleros.backend.service;

import com.semilleros.backend.dto.ActividadRequestDTO;
import com.semilleros.backend.dto.ActividadResponseDTO;
import com.semilleros.backend.entity.Actividad;
import com.semilleros.backend.entity.Semillero;
import com.semilleros.backend.entity.TipoActividad;
import com.semilleros.backend.exception.ResourceNotFoundException;
import com.semilleros.backend.repository.ActividadRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActividadServiceTest {

    @Mock
    private ActividadRepository actividadRepository;

    @Mock
    private SemilleroService semilleroService;

    @Mock
    private TipoActividadService tipoActividadService;

    @InjectMocks
    private ActividadService actividadService;

    @Test
    void create_shouldSaveAndReturnActividad_whenValid() {
        Semillero semillero = Semillero.builder().id(10L).nombre("Semillero IA").sigla("SIAA").build();
        TipoActividad tipo = TipoActividad.builder().id(5L).nombre("Espacio de socialización").build();

        ActividadRequestDTO request = ActividadRequestDTO.builder()
                .semilleroId(10L)
                .tipoActividadId(5L)
                .nombre("Apertura Semana Internacional Ciencia y Tecnología")
                .porcentajeCumplimiento(100)
                .build();

        Actividad saved = Actividad.builder()
                .id(1L)
                .semillero(semillero)
                .tipoActividad(tipo)
                .nombre("Apertura Semana Internacional Ciencia y Tecnología")
                .porcentajeCumplimiento(100)
                .build();

        when(semilleroService.findEntityById(10L)).thenReturn(semillero);
        when(tipoActividadService.findEntityById(5L)).thenReturn(tipo);
        when(actividadRepository.save(any(Actividad.class))).thenReturn(saved);

        ActividadResponseDTO result = actividadService.create(request);

        assertEquals(1L, result.getId());
        assertEquals(10L, result.getSemilleroId());
        assertEquals("SIAA", result.getSemilleroSigla());
        assertEquals("Espacio de socialización", result.getTipoActividadNombre());
        assertEquals("Apertura Semana Internacional Ciencia y Tecnología", result.getNombre());
        assertEquals(100, result.getPorcentajeCumplimiento());
    }

    @Test
    void findBySemilleroId_shouldReturnList() {
        Semillero semillero = Semillero.builder().id(10L).nombre("Semillero IA").sigla("SIAA").build();
        TipoActividad tipo = TipoActividad.builder().id(5L).nombre("Feria de carreras").build();
        Actividad act = Actividad.builder()
                .id(2L)
                .semillero(semillero)
                .tipoActividad(tipo)
                .nombre("Participación en feria de carreras")
                .porcentajeCumplimiento(100)
                .build();

        when(semilleroService.findEntityById(10L)).thenReturn(semillero);
        when(actividadRepository.findBySemilleroId(10L)).thenReturn(List.of(act));

        List<ActividadResponseDTO> result = actividadService.findBySemilleroId(10L);

        assertEquals(1, result.size());
        assertEquals("Participación en feria de carreras", result.get(0).getNombre());
    }

    @Test
    void findById_shouldThrowResourceNotFoundException_whenNotFound() {
        when(actividadRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> actividadService.findById(99L));
    }

    @Test
    void delete_shouldRemoveActividad_whenExists() {
        Actividad act = Actividad.builder().id(3L).build();
        when(actividadRepository.findById(3L)).thenReturn(Optional.of(act));

        actividadService.delete(3L);

        verify(actividadRepository).delete(act);
    }
}

