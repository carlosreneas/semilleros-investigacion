package com.semilleros.backend.service;

import com.semilleros.backend.dto.TipoActividadRequestDTO;
import com.semilleros.backend.dto.TipoActividadResponseDTO;
import com.semilleros.backend.entity.TipoActividad;
import com.semilleros.backend.exception.BusinessException;
import com.semilleros.backend.exception.ResourceNotFoundException;
import com.semilleros.backend.repository.ActividadRepository;
import com.semilleros.backend.repository.TipoActividadRepository;
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
class TipoActividadServiceTest {

    @Mock
    private TipoActividadRepository tipoActividadRepository;

    @Mock
    private ActividadRepository actividadRepository;

    @InjectMocks
    private TipoActividadService tipoActividadService;

    @Test
    void findAll_shouldReturnAllTipos() {
        TipoActividad tipo = TipoActividad.builder().id(1L).nombre("Espacio de socialización").build();
        when(tipoActividadRepository.findAll()).thenReturn(List.of(tipo));

        List<TipoActividadResponseDTO> result = tipoActividadService.findAll();

        assertEquals(1, result.size());
        assertEquals("Espacio de socialización", result.get(0).getNombre());
    }

    @Test
    void create_shouldSaveAndReturn_whenValid() {
        TipoActividadRequestDTO request = new TipoActividadRequestDTO("Feria de carreras");
        TipoActividad saved = TipoActividad.builder().id(2L).nombre("Feria de carreras").build();

        when(tipoActividadRepository.existsByNombreIgnoreCase("Feria de carreras")).thenReturn(false);
        when(tipoActividadRepository.save(any(TipoActividad.class))).thenReturn(saved);

        TipoActividadResponseDTO result = tipoActividadService.create(request);

        assertEquals(2L, result.getId());
        assertEquals("Feria de carreras", result.getNombre());
    }

    @Test
    void create_shouldThrowBusinessException_whenNameDuplicated() {
        TipoActividadRequestDTO request = new TipoActividadRequestDTO("Feria de carreras");
        when(tipoActividadRepository.existsByNombreIgnoreCase("Feria de carreras")).thenReturn(true);

        assertThrows(BusinessException.class, () -> tipoActividadService.create(request));
    }

    @Test
    void delete_shouldThrowBusinessException_whenHasAssociatedActividades() {
        TipoActividad tipo = TipoActividad.builder().id(1L).nombre("Espacio de socialización").build();
        when(tipoActividadRepository.findById(1L)).thenReturn(Optional.of(tipo));
        when(actividadRepository.existsByTipoActividadId(1L)).thenReturn(true);

        assertThrows(BusinessException.class, () -> tipoActividadService.delete(1L));
    }

    @Test
    void delete_shouldRemove_whenNoAssociatedActividades() {
        TipoActividad tipo = TipoActividad.builder().id(1L).nombre("Espacio de socialización").build();
        when(tipoActividadRepository.findById(1L)).thenReturn(Optional.of(tipo));
        when(actividadRepository.existsByTipoActividadId(1L)).thenReturn(false);

        tipoActividadService.delete(1L);

        verify(tipoActividadRepository).delete(tipo);
    }
}

