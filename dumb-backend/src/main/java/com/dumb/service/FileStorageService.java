package com.dumb.service;

import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final String UPLOAD_DIR = "uploads";
    private static final long MAX_REMOTE_IMAGE_BYTES = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Cursor-Dumb/1.0";

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(60))
        .followRedirects(HttpClient.Redirect.NORMAL)
        .build();

    public String saveUploadedImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IOException("文件不能为空");
        }
        String originalFilename = file.getOriginalFilename();
        String ext = normalizeExtension(StringUtils.getFilenameExtension(originalFilename));
        if (!isSupportedExtension(ext)) {
            throw new IOException("仅支持 JPG/PNG/WEBP 格式");
        }
        Path target = prepareTargetPath(ext);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        compressInPlace(target);
        return toPublicPath(target);
    }

    public String downloadRemoteImage(String imageUrl) throws IOException, InterruptedException {
        if (!StringUtils.hasText(imageUrl)) {
            throw new IOException("图片地址不能为空");
        }
        URI uri = URI.create(imageUrl.trim());
        String scheme = uri.getScheme();
        if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
            throw new IOException("仅支持 HTTP/HTTPS 图片地址");
        }

        HttpRequest request = HttpRequest.newBuilder(uri)
            .timeout(Duration.ofSeconds(30))
            .header("Accept", "image/*")
            .header("User-Agent", USER_AGENT)
            .GET()
            .build();
        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("下载图片失败，状态码: " + response.statusCode());
        }
        byte[] bytes = response.body();
        if (bytes == null || bytes.length == 0) {
            throw new IOException("图片内容为空");
        }
        if (bytes.length > MAX_REMOTE_IMAGE_BYTES) {
            throw new IOException("图片过大，超过 10MB");
        }
        String ext = resolveExtension(uri, response.headers().firstValue("Content-Type").orElse(""));
        if (!isSupportedExtension(ext)) {
            throw new IOException("不支持的图片格式");
        }
        Path target = prepareTargetPath(ext);
        Files.write(target, bytes);
        compressInPlace(target);
        return toPublicPath(target);
    }

    /** 上传后压图：长边>1920则缩放；JPEG重编码q0.82；仅当结果更小才替换原文件。WebP/读取失败则原样保留。 */
    private static void compressInPlace(Path target) {
        String name = target.getFileName().toString().toLowerCase(Locale.ROOT);
        if (!(name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png"))) {
            return;
        }
        try {
            java.awt.image.BufferedImage img = javax.imageio.ImageIO.read(target.toFile());
            if (img == null) {
                return;
            }
            int longSide = Math.max(img.getWidth(), img.getHeight());
            boolean needResize = longSide > 1920;
            long origSize = Files.size(target);
            if (!needResize && origSize < 500_000) {
                return; // 小图不动，避免无谓的二次有损
            }
            java.io.File tmp = target.resolveSibling(target.getFileName() + ".cmp.tmp").toFile();
            try {
                var builder = Thumbnails.of(img).useExifOrientation(true);
                if (needResize) {
                    double scale = 1920.0 / longSide;
                    builder = builder.width((int) Math.round(img.getWidth() * scale))
                                     .height((int) Math.round(img.getHeight() * scale));
                }
                if (name.endsWith(".png")) {
                    builder.outputFormat("png").toFile(tmp);
                } else {
                    builder.outputFormat("jpg").outputQuality(0.82).toFile(tmp);
                }
                if (tmp.exists() && tmp.length() < origSize) {
                    Files.move(tmp.toPath(), target, StandardCopyOption.REPLACE_EXISTING);
                } else {
                    tmp.delete();
                }
            } finally {
                if (tmp.exists()) {
                    tmp.delete();
                }
            }
        } catch (Exception ignore) {
            // 压缩失败保留原图，绝不影响上传流程
        }
    }

    private static Path prepareTargetPath(String ext) throws IOException {
        Path uploadPath = Paths.get(UPLOAD_DIR).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);
        String filename = UUID.randomUUID() + "." + ext;
        return uploadPath.resolve(filename);
    }

    private static String toPublicPath(Path target) {
        return "/uploads/" + target.getFileName();
    }

    private static boolean isSupportedExtension(String ext) {
        return StringUtils.hasText(ext) && ALLOWED_EXTENSIONS.contains(ext);
    }

    private static String normalizeExtension(String ext) {
        if (!StringUtils.hasText(ext)) {
            return "";
        }
        return ext.toLowerCase(Locale.ROOT).trim();
    }

    private static String resolveExtension(URI uri, String contentType) {
        String byContentType = extensionByContentType(contentType);
        if (StringUtils.hasText(byContentType)) {
            return byContentType;
        }
        String path = uri.getPath();
        return normalizeExtension(StringUtils.getFilenameExtension(path));
    }

    private static String extensionByContentType(String contentType) {
        if (!StringUtils.hasText(contentType)) {
            return "";
        }
        String ct = contentType.toLowerCase(Locale.ROOT);
        if (ct.contains("image/jpeg") || ct.contains("image/jpg")) {
            return "jpg";
        }
        if (ct.contains("image/png")) {
            return "png";
        }
        if (ct.contains("image/webp")) {
            return "webp";
        }
        return "";
    }
}
