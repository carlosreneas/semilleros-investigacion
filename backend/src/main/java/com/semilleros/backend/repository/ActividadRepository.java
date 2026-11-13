package com.semilleros.backend.repository;

import com.semilleros.backend.entity.Actividad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActividadRepository extends JpaRepository<Actividad, Long> {

    List<Actividad> findBySemilleroId(Long semilleroId);

    boolean existsBySemilleroId(Long semilleroId);

    boolean existsByTipoActividadId(Long tipoActividadId);
}
