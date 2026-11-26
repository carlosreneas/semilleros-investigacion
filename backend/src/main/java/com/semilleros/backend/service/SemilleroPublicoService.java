package com.semilleros.backend.service;

import com.semilleros.backend.dto.LineaResponseDTO;
import com.semilleros.backend.dto.SemilleroPublicoResponseDTO;
import com.semilleros.backend.dto.SemilleroPublicoResponseDTO.CapacitacionPublicoDTO;
import com.semilleros.backend.dto.SemilleroPublicoResponseDTO.IntegrantePublicoDTO;
import com.semilleros.backend.dto.SemilleroPublicoResponseDTO.ProductoPublicoDTO;
import com.semilleros.backend.entity.Capacitacion;
import com.semilleros.backend.entity.Integrante;
import com.semilleros.backend.entity.Linea;
import com.semilleros.backend.entity.Producto;
import com.semilleros.backend.entity.Semillero;
import com.semilleros.backend.repository.CapacitacionRepository;
import com.semilleros.backend.repository.IntegranteRepository;
import com.semilleros.backend.repository.ProductoRepository;
import com.semilleros.backend.repository.SemilleroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SemilleroPublicoService {

    private final SemilleroRepository semilleroRepository;
    private final IntegranteRepository integranteRepository;
    private final ProductoRepository productoRepository;
    private final CapacitacionRepository capacitacionRepository;
    private final SemilleroService semilleroService;
    private final LineaService lineaService;

    @Transactional(readOnly = true)
    public List<SemilleroPublicoResponseDTO> findAll() {
        return semilleroRepository.findAll()
                .stream()
                .map(s -> toDTO(s, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public SemilleroPublicoResponseDTO findById(Long id) {
        Semillero semillero = semilleroService.findEntityById(id);
        return toDTO(semillero, true);
    }

    // ── Mapeo ─────────────────────────────────────────────────────────────────

    private SemilleroPublicoResponseDTO toDTO(Semillero s, boolean incluirDetalle) {
        List<LineaResponseDTO> lineas = s.getLineas().stream()
                .sorted(Comparator.comparing(Linea::getId))
                .map(lineaService::toResponseDTO)
                .toList();

        SemilleroPublicoResponseDTO.SemilleroPublicoResponseDTOBuilder builder =
                SemilleroPublicoResponseDTO.builder()
                        .id(s.getId())
                        .nombre(s.getNombre())
                        .sigla(s.getSigla())
                        .logoUrl(s.getLogoUrl())
                        .mision(s.getMision())
                        .vision(s.getVision())
                        .objetivoGeneral(s.getObjetivoGeneral())
                        .directorNombre(s.getDirector() != null ? s.getDirector().getNombre() : null)
                        .directorCorreo(s.getDirector() != null ? s.getDirector().getCorreo() : null)
                        .grupoNombre(s.getGrupoInvestigacion() != null ? s.getGrupoInvestigacion().getNombre() : null)
                        .grupoSigla(s.getGrupoInvestigacion() != null ? s.getGrupoInvestigacion().getSigla() : null)
                        .grupoFacultad(s.getGrupoInvestigacion() != null ? s.getGrupoInvestigacion().getFacultad() : null)
                        .grupoCategoria(s.getGrupoInvestigacion() != null ? s.getGrupoInvestigacion().getCategoria() : null)
                        .grupoSitioWeb(s.getGrupoInvestigacion() != null ? s.getGrupoInvestigacion().getSitioWeb() : null)
                        .lineas(lineas);

        if (incluirDetalle) {
            builder.integrantes(mapIntegrantes(s.getId()))
                   .productos(mapProductos(s.getId()))
                   .capacitaciones(mapCapacitaciones(s.getId()));
        }

        return builder.build();
    }

    private List<IntegrantePublicoDTO> mapIntegrantes(Long semilleroId) {
        return integranteRepository.findBySemilleroId(semilleroId)
                .stream()
                .sorted(Comparator.comparing((Integrante i) -> Boolean.TRUE.equals(i.getEsLider()) ? 0 : 1)
                        .thenComparing(Integrante::getNombre))
                .map(i -> IntegrantePublicoDTO.builder()
                        .nombre(i.getNombre())
                        .programa(i.getPrograma() != null ? i.getPrograma().getNombre() : null)
                        .semestreActual(i.getSemestreActual())
                        .esLider(i.getEsLider())
                        .build())
                .toList();
    }

    private List<ProductoPublicoDTO> mapProductos(Long semilleroId) {
        return productoRepository.findBySemilleroId(semilleroId)
                .stream()
                .map(p -> ProductoPublicoDTO.builder()
                        .nombre(p.getNombre())
                        .descripcion(p.getDescripcion())
                        .tipoNombre(p.getTipo() != null ? p.getTipo().getNombre() : null)
                        .tipoCategoria(p.getTipo() != null ? p.getTipo().getCategoria() : null)
                        .participantes(p.getIntegrantes().stream()
                                .map(Integrante::getNombre)
                                .toList())
                        .build())
                .toList();
    }

    private List<CapacitacionPublicoDTO> mapCapacitaciones(Long semilleroId) {
        return capacitacionRepository.findBySemilleroId(semilleroId)
                .stream()
                .sorted(Comparator.comparing(Capacitacion::getFecha,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(c -> CapacitacionPublicoDTO.builder()
                        .nombre(c.getNombreCapacitacion())
                        .fecha(c.getFecha() != null ? c.getFecha().toString() : null)
                        .objetivo(c.getObjetivoCapacitacion())
                        .participantes(c.getCantidadParticipantes())
                        .build())
                .toList();
    }
}
