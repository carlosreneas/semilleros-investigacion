package com.semilleros.backend.service;

import com.semilleros.backend.dto.ActividadRequestDTO;
import com.semilleros.backend.dto.ActividadResponseDTO;
import com.semilleros.backend.entity.Actividad;
import com.semilleros.backend.entity.Semillero;
import com.semilleros.backend.entity.TipoActividad;
import com.semilleros.backend.exception.ResourceNotFoundException;
import com.semilleros.backend.repository.ActividadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActividadService {

    private final ActividadRepository actividadRepository;
    private final SemilleroService semilleroService;
    private final TipoActividadService tipoActividadService;

    @Transactional(readOnly = true)
    public List<ActividadResponseDTO> findAll() {
        return actividadRepository.findAll()
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActividadResponseDTO> findBySemilleroId(Long semilleroId) {
        semilleroService.findEntityById(semilleroId);
        return actividadRepository.findBySemilleroId(semilleroId)
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public ActividadResponseDTO findById(Long id) {
        return toResponseDTO(findEntityById(id));
    }

    @Transactional
    public ActividadResponseDTO create(ActividadRequestDTO request) {
        Semillero semillero = semilleroService.findEntityById(request.getSemilleroId());
        TipoActividad tipoActividad = tipoActividadService.findEntityById(request.getTipoActividadId());

        Actividad actividad = Actividad.builder()
                .semillero(semillero)
                .tipoActividad(tipoActividad)
                .nombre(request.getNombre().trim())
                .porcentajeCumplimiento(request.getPorcentajeCumplimiento())
                .build();

        return toResponseDTO(actividadRepository.save(actividad));
    }

    @Transactional
    public ActividadResponseDTO update(Long id, ActividadRequestDTO request) {
        Actividad actividad = findEntityById(id);
        Semillero semillero = semilleroService.findEntityById(request.getSemilleroId());
        TipoActividad tipoActividad = tipoActividadService.findEntityById(request.getTipoActividadId());

        actividad.setSemillero(semillero);
        actividad.setTipoActividad(tipoActividad);
        actividad.setNombre(request.getNombre().trim());
        actividad.setPorcentajeCumplimiento(request.getPorcentajeCumplimiento());

        return toResponseDTO(actividadRepository.save(actividad));
    }

    @Transactional
    public void delete(Long id) {
        Actividad actividad = findEntityById(id);
        actividadRepository.delete(actividad);
    }

    private Actividad findEntityById(Long id) {
        return actividadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Actividad no encontrada con id: " + id));
    }

    private ActividadResponseDTO toResponseDTO(Actividad actividad) {
        Semillero semillero = actividad.getSemillero();
        TipoActividad tipo = actividad.getTipoActividad();

        return ActividadResponseDTO.builder()
                .id(actividad.getId())
                .semilleroId(semillero.getId())
                .semilleroNombre(semillero.getNombre())
                .semilleroSigla(semillero.getSigla())
                .tipoActividadId(tipo.getId())
                .tipoActividadNombre(tipo.getNombre())
                .nombre(actividad.getNombre())
                .porcentajeCumplimiento(actividad.getPorcentajeCumplimiento())
                .build();
    }
}

