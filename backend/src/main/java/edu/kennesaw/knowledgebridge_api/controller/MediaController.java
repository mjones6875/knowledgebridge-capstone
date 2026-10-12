package edu.kennesaw.knowledgebridge_api.controller;

import edu.kennesaw.knowledgebridge_api.dto.MediaIngestionResponse;
import edu.kennesaw.knowledgebridge_api.dto.TranscriptionResponse;
import edu.kennesaw.knowledgebridge_api.service.MediaIngestionService;
import edu.kennesaw.knowledgebridge_api.service.TranscriptionClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/gbrain")
public class MediaController {

    private final TranscriptionClient transcriptionClient;
    private final MediaIngestionService mediaIngestionService;

    public MediaController(
            TranscriptionClient transcriptionClient,
            MediaIngestionService mediaIngestionService
    ) {
        this.transcriptionClient = transcriptionClient;
        this.mediaIngestionService = mediaIngestionService;
    }

    @PostMapping(
            value = "/media/transcribe",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public TranscriptionResponse transcribe(
            @RequestPart("file") MultipartFile file
    ) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException(
                    "An audio or video file is required"
            );
        }

        return transcriptionClient.transcribe(file);
    }

    @PostMapping(
            value = "/ingest/media",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public MediaIngestionResponse ingestMedia(
            @RequestPart("file") MultipartFile file,

            @RequestPart(
                    value = "title",
                    required = false
            )
            String title,

            @RequestPart(
                    value = "slug",
                    required = false
            )
            String slug,

            @RequestPart(
                    value = "tags",
                    required = false
            )
            String tags
    ) {
        return mediaIngestionService.ingest(
                file,
                title,
                slug,
                parseTags(tags)
        );
    }

    private List<String> parseTags(String tags) {
        if (tags == null || tags.isBlank()) {
            return List.of();
        }

        return Arrays.stream(tags.split(","))
                .map(String::trim)
                .filter(tag -> !tag.isBlank())
                .toList();
    }
}