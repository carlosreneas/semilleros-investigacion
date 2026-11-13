package com.semilleros.backend.controller;

import com.semilleros.backend.dto.TipoActividadRequestDTO;
import com.semilleros.backend.dto.TipoActividadResponseDTO;
import com.semilleros.backend.service.TipoActividadService;
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
@RequestMapping("/api/tipos-actividad")
@RequiredArgsConstructor
@Tag(name = "Tipos de Actividad", description = "Operaciones CRUD para la gestión del catálogo de tipos de actividad de investigación")
public class TipoActividadController {

    private final TipoActividadService tipoActividadService;

    @GetMapping
    @Operation(summary = "Listar tipos de actividad", description = "Retorna todos los tipos de actividad de investigación registrados")
    public ResponseEntity<List<TipoActividadResponseDTO>> findAll() {
        return ResponseEntity.ok(tipoActividadService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener tipo de actividad por ID", description = "Retorna un tipo de actividad según su identificador")
    public ResponseEntity<TipoActividadResponseDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(tipoActividadService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Crear tipo de actividad", description = "Registra un nuevo tipo de actividad en el catálogo")
    public ResponseEntity<TipoActividadResponseDTO> create(@Valid @RequestBody TipoActividadRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tipoActividadService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar tipo de actividad", description = "Actualiza el nombre de un tipo de actividad existente")
    public ResponseEntity<TipoActividadResponseDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody TipoActividadRequestDTO request) {
        return ResponseEntity.ok(tipoActividadService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar tipo de actividad", description = "Elimina un tipo de actividad por su identificador")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        tipoActividadService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

