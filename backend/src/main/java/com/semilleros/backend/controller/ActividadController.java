package com.semilleros.backend.controller;

import com.semilleros.backend.dto.ActividadRequestDTO;
import com.semilleros.backend.dto.ActividadResponseDTO;
import com.semilleros.backend.service.ActividadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/actividades")
@RequiredArgsConstructor
@Tag(name = "Actividades de Investigación", description = "Operaciones CRUD para la gestión de otras actividades de investigación de los semilleros")
public class ActividadController {

    private final ActividadService actividadService;

    @GetMapping
    @Operation(summary = "Listar actividades", description = "Retorna todas las actividades de investigación registradas")
    public ResponseEntity<List<ActividadResponseDTO>> findAll() {
        return ResponseEntity.ok(actividadService.findAll());
    }

    @GetMapping("/semillero/{semilleroId}")
    @Operation(summary = "Listar actividades por semillero", description = "Retorna las actividades de investigación correspondientes a un semillero")
    public ResponseEntity<List<ActividadResponseDTO>> findBySemilleroId(@PathVariable Long semilleroId) {
        return ResponseEntity.ok(actividadService.findBySemilleroId(semilleroId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener actividad por ID", description = "Retorna una actividad de investigación según su identificador")
    public ResponseEntity<ActividadResponseDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(actividadService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Crear actividad", description = "Registra una nueva actividad de investigación para un semillero")
    public ResponseEntity<ActividadResponseDTO> create(@Valid @RequestBody ActividadRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(actividadService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar actividad", description = "Actualiza los datos de una actividad existente")
    public ResponseEntity<ActividadResponseDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody ActividadRequestDTO request) {
        return ResponseEntity.ok(actividadService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar actividad", description = "Elimina una actividad de investigación por su identificador")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        actividadService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
