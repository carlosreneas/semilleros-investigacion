package com.semilleros.backend.service;

import com.semilleros.backend.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Map<String, String> ALLOWED_CONTENT_TYPES = Map.of(
            "image/png", ".png",
            "image/jpeg", ".jpg",
            "image/jpg", ".jpg",
            "image/webp", ".webp",
            "image/gif", ".gif",
            "image/svg+xml", ".svg"
    );

    private final Path uploadRoot;

    public FileStorageService(@Value("${app.upload.dir:${user.home}/semilleros-uploads}") String uploadDir) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public String storeLogo(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Debes seleccionar un archivo de imagen");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.containsKey(contentType.toLowerCase())) {
            throw new BusinessException("Formato no permitido. Usa PNG, JPG, WEBP, GIF o SVG");
        }

        String extension = ALLOWED_CONTENT_TYPES.get(contentType.toLowerCase());
        String filename = UUID.randomUUID() + extension;

        try {
            Path logosDir = uploadRoot.resolve("logos");
            Files.createDirectories(logosDir);
            Path targetPath = logosDir.resolve(filename).normalize();
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/logos/" + filename;
        } catch (IOException ex) {
            throw new BusinessException("No se pudo guardar la imagen en el disco local: " + ex.getMessage());
        }
    }

    public String getUploadRootPath() {
        return uploadRoot.toString();
    }
}
