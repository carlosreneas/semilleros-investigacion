package com.semilleros.backend.service;

import com.semilleros.backend.dto.LineaResponseDTO;
import com.semilleros.backend.dto.SemilleroRequestDTO;
import com.semilleros.backend.dto.SemilleroResponseDTO;
import com.semilleros.backend.entity.Director;
import com.semilleros.backend.entity.Linea;
import com.semilleros.backend.entity.Semillero;
import com.semilleros.backend.exception.BusinessException;
import com.semilleros.backend.exception.ResourceNotFoundException;
import com.semilleros.backend.repository.ActividadRepository;
import com.semilleros.backend.repository.IntegranteRepository;
import com.semilleros.backend.repository.ProductoRepository;
import com.semilleros.backend.repository.SemilleroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SemilleroService {

    private final SemilleroRepository semilleroRepository;
    private final IntegranteRepository integranteRepository;
    private final ProductoRepository productoRepository;
    private final ActividadRepository actividadRepository;
    private final DirectorService directorService;
    private final LineaService lineaService;

    @Transactional(readOnly = true)
    public List<SemilleroResponseDTO> findAll() {
        return semilleroRepository.findAll()
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public SemilleroResponseDTO findById(Long id) {
        return toResponseDTO(findEntityById(id));
    }

    @Transactional
    public SemilleroResponseDTO create(SemilleroRequestDTO request) {
        String sigla = request.getSigla().trim();
        if (semilleroRepository.existsBySiglaIgnoreCase(sigla)) {
            throw new BusinessException("Ya existe un semillero registrado con la sigla: " + sigla);
        }

        Director director = directorService.findEntityById(request.getDirectorId());
        Set<Linea> lineas = resolveLineas(request.getLineaIds());

        Semillero semillero = Semillero.builder()
                .nombre(request.getNombre().trim())
                .sigla(sigla)
                .grupoInvestigacion(request.getGrupoInvestigacion().trim())
                .mision(request.getMision())
                .vision(request.getVision())
                .objetivoGeneral(request.getObjetivoGeneral())
                .director(director)
                .lineas(lineas)
                .build();

        return toResponseDTO(semilleroRepository.save(semillero));
    }

    @Transactional
    public SemilleroResponseDTO update(Long id, SemilleroRequestDTO request) {
        Semillero semillero = findEntityById(id);
        String sigla = request.getSigla().trim();

        if (semilleroRepository.existsBySiglaIgnoreCaseAndIdNot(sigla, id)) {
            throw new BusinessException("Ya existe otro semillero registrado con la sigla: " + sigla);
        }

        Director director = directorService.findEntityById(request.getDirectorId());

        semillero.setNombre(request.getNombre().trim());
        semillero.setSigla(sigla);
        semillero.setGrupoInvestigacion(request.getGrupoInvestigacion().trim());
        semillero.setMision(request.getMision());
        semillero.setVision(request.getVision());
        semillero.setObjetivoGeneral(request.getObjetivoGeneral());
        semillero.setDirector(director);
        if (request.getLineaIds() != null) {
            semillero.setLineas(resolveLineas(request.getLineaIds()));
        }

        return toResponseDTO(semilleroRepository.save(semillero));
    }

    @Transactional
    public SemilleroResponseDTO addLinea(Long semilleroId, Long lineaId) {
        Semillero semillero = findEntityById(semilleroId);
        Linea linea = lineaService.findEntityById(lineaId);
        semillero.getLineas().add(linea);
        return toResponseDTO(semilleroRepository.save(semillero));
    }

    @Transactional
    public SemilleroResponseDTO removeLinea(Long semilleroId, Long lineaId) {
        Semillero semillero = findEntityById(semilleroId);
        Linea linea = lineaService.findEntityById(lineaId);
        if (!semillero.getLineas().remove(linea)) {
            throw new ResourceNotFoundException("La línea no está asociada al semillero con id: " + semilleroId);
        }
        return toResponseDTO(semilleroRepository.save(semillero));
    }

    @Transactional
    public void delete(Long id) {
        Semillero semillero = findEntityById(id);
        if (integranteRepository.existsBySemilleroId(id)) {
            throw new BusinessException("No se puede eliminar el semillero porque tiene integrantes asociados");
        }
        if (productoRepository.existsBySemilleroId(id)) {
            throw new BusinessException("No se puede eliminar el semillero porque tiene productos asociados");
        }
        if (actividadRepository.existsBySemilleroId(id)) {
            throw new BusinessException("No se puede eliminar el semillero porque tiene actividades asociadas");
        }
        semillero.getLineas().clear();
        semilleroRepository.delete(semillero);
    }


    public Semillero findEntityById(Long id) {
        return semilleroRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semillero no encontrado con id: " + id));
    }

    private Set<Linea> resolveLineas(Set<Long> lineaIds) {
        Set<Linea> lineas = new HashSet<>();
        if (lineaIds != null) {
            for (Long lineaId : lineaIds) {
                lineas.add(lineaService.findEntityById(lineaId));
            }
        }
        return lineas;
    }

    private SemilleroResponseDTO toResponseDTO(Semillero semillero) {
        List<LineaResponseDTO> lineasDTO = semillero.getLineas().stream()
                .sorted(Comparator.comparing(Linea::getId))
                .map(lineaService::toResponseDTO)
                .toList();

        return SemilleroResponseDTO.builder()
                .id(semillero.getId())
                .nombre(semillero.getNombre())
                .sigla(semillero.getSigla())
                .grupoInvestigacion(semillero.getGrupoInvestigacion())
                .mision(semillero.getMision())
                .vision(semillero.getVision())
                .objetivoGeneral(semillero.getObjetivoGeneral())
                .director(directorService.toResponseDTO(semillero.getDirector()))
                .lineas(lineasDTO)
                .build();
    }
}
