package com.semilleros.backend.controller;

import com.semilleros.backend.dto.EnviarCorreoSemilleroRequestDTO;
import com.semilleros.backend.dto.EnviarCorreoSemilleroResponseDTO;
import com.semilleros.backend.dto.SemilleroRequestDTO;
import com.semilleros.backend.dto.SemilleroResponseDTO;
import com.semilleros.backend.service.CorreoSemilleroService;
import com.semilleros.backend.service.SemilleroService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/semilleros")
@RequiredArgsConstructor
@Tag(name = "Semilleros", description = "Operaciones CRUD para la gestión de semilleros de investigación")
public class SemilleroController {

    private final SemilleroService semilleroService;
    private final CorreoSemilleroService correoSemilleroService;

    @GetMapping
    @Operation(summary = "Listar semilleros", description = "Retorna todos los semilleros registrados")
    public ResponseEntity<List<SemilleroResponseDTO>> findAll() {
        return ResponseEntity.ok(semilleroService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener semillero por ID", description = "Retorna un semillero según su identificador")
    public ResponseEntity<SemilleroResponseDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(semilleroService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Crear semillero", description = "Registra un nuevo semillero validando sigla única y existencia del director")
    public ResponseEntity<SemilleroResponseDTO> create(@Valid @RequestBody SemilleroRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(semilleroService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar semillero", description = "Actualiza los datos de un semillero existente")
    public ResponseEntity<SemilleroResponseDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody SemilleroRequestDTO request) {
        return ResponseEntity.ok(semilleroService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar semillero", description = "Elimina un semillero por su identificador")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        semilleroService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Subir foto del semillero", description = "Almacena la imagen en disco en el dispositivo y asocia la ruta/URL al semillero")
    public ResponseEntity<SemilleroResponseDTO> uploadFoto(
            @PathVariable Long id,
            @RequestParam("foto") MultipartFile foto) {
        return ResponseEntity.ok(semilleroService.uploadFoto(id, foto));
    }

    @DeleteMapping("/{id}/foto")
    @Operation(summary = "Eliminar foto del semillero", description = "Elimina la foto del semillero del disco y limpia la URL")
    public ResponseEntity<SemilleroResponseDTO> deleteFoto(@PathVariable Long id) {
        return ResponseEntity.ok(semilleroService.deleteFoto(id));
    }

    @PostMapping("/{semilleroId}/lineas/{lineaId}")
    @Operation(summary = "Asociar línea a semillero", description = "Asocia una línea de investigación existente a un semillero")
    public ResponseEntity<SemilleroResponseDTO> addLinea(
            @PathVariable Long semilleroId,
            @PathVariable Long lineaId) {
        return ResponseEntity.ok(semilleroService.addLinea(semilleroId, lineaId));
    }

    @DeleteMapping("/{semilleroId}/lineas/{lineaId}")
    @Operation(summary = "Desasociar línea de semillero", description = "Remueve la asociación entre un semillero y una línea de investigación")
    public ResponseEntity<SemilleroResponseDTO> removeLinea(
            @PathVariable Long semilleroId,
            @PathVariable Long lineaId) {
        return ResponseEntity.ok(semilleroService.removeLinea(semilleroId, lineaId));
    }

    @PostMapping(value = "/{id}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Subir logo del semillero", description = "Carga y asocia una imagen de logo para el semillero en el almacenamiento configurado")
    public ResponseEntity<SemilleroResponseDTO> uploadLogo(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(semilleroService.uploadLogo(id, file));
    }

    @GetMapping("/{id}/logo")
    @Operation(summary = "Obtener logo del semillero", description = "Descarga o visualiza directamente el archivo binario del logo del semillero")
    public ResponseEntity<Resource> getLogo(@PathVariable Long id) {
        return semilleroService.getLogo(id);
    }

    @PostMapping("/{id}/correo")
    @Operation(summary = "Enviar correo a los participantes del semillero", description = "Envía un correo electrónico exclusivamente a los integrantes que pertenecen al semillero especificado")
    public ResponseEntity<EnviarCorreoSemilleroResponseDTO> enviarCorreo(
            @PathVariable Long id,
            @Valid @RequestBody EnviarCorreoSemilleroRequestDTO request) {
        return ResponseEntity.ok(correoSemilleroService.enviarCorreoAParticipantes(id, request));
    }
}

