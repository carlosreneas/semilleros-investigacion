package com.semilleros.backend.service;

import com.semilleros.backend.dto.TipoActividadRequestDTO;
import com.semilleros.backend.dto.TipoActividadResponseDTO;
import com.semilleros.backend.entity.TipoActividad;
import com.semilleros.backend.exception.BusinessException;
import com.semilleros.backend.exception.ResourceNotFoundException;
import com.semilleros.backend.repository.ActividadRepository;
import com.semilleros.backend.repository.TipoActividadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TipoActividadService {

    private final TipoActividadRepository tipoActividadRepository;
    private final ActividadRepository actividadRepository;

    @Transactional(readOnly = true)
    public List<TipoActividadResponseDTO> findAll() {
        return tipoActividadRepository.findAll()
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public TipoActividadResponseDTO findById(Long id) {
        return toResponseDTO(findEntityById(id));
    }

    @Transactional
    public TipoActividadResponseDTO create(TipoActividadRequestDTO request) {
        String nombre = request.getNombre().trim();
        if (tipoActividadRepository.existsByNombreIgnoreCase(nombre)) {
            throw new BusinessException("Ya existe un tipo de actividad con el nombre: " + nombre);
        }

        TipoActividad tipo = TipoActividad.builder()
                .nombre(nombre)
                .build();

        return toResponseDTO(tipoActividadRepository.save(tipo));
    }

    @Transactional
    public TipoActividadResponseDTO update(Long id, TipoActividadRequestDTO request) {
        TipoActividad tipo = findEntityById(id);
        String nombre = request.getNombre().trim();

        if (tipoActividadRepository.existsByNombreIgnoreCaseAndIdNot(nombre, id)) {
            throw new BusinessException("Ya existe otro tipo de actividad con el nombre: " + nombre);
        }

        tipo.setNombre(nombre);
        return toResponseDTO(tipoActividadRepository.save(tipo));
    }

    @Transactional
    public void delete(Long id) {
        TipoActividad tipo = findEntityById(id);
        if (actividadRepository.existsByTipoActividadId(id)) {
            throw new BusinessException("No se puede eliminar el tipo de actividad porque está asociado a una o más actividades");
        }
        tipoActividadRepository.delete(tipo);
    }

    public TipoActividad findEntityById(Long id) {
        return tipoActividadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tipo de actividad no encontrado con id: " + id));
    }

    public TipoActividadResponseDTO toResponseDTO(TipoActividad tipo) {
        return TipoActividadResponseDTO.builder()
                .id(tipo.getId())
                .nombre(tipo.getNombre())
                .build();
    }
}

