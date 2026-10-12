package edu.kennesaw.knowledgebridge_api.service;

import edu.kennesaw.knowledgebridge_api.dto.MediaIngestionResponse;
import edu.kennesaw.knowledgebridge_api.dto.TextIngestionRequest;
import edu.kennesaw.knowledgebridge_api.dto.TranscriptionResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
public class MediaIngestionService {

    private final TranscriptionClient transcriptionClient;
    private final GbrainMcpService gbrainMcpService;

    public MediaIngestionService(
            TranscriptionClient transcriptionClient,
            GbrainMcpService gbrainMcpService
    ) {
        this.transcriptionClient = transcriptionClient;
        this.gbrainMcpService = gbrainMcpService;
    }

    public MediaIngestionResponse ingest(
            MultipartFile file,
            String requestedTitle,
            String requestedSlug,
            List<String> requestedTags
    ) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(
                    "An audio or video file is required"
            );
        }

        TranscriptionResponse transcription =
                transcriptionClient.transcribe(file);

        if (transcription.text() == null
                || transcription.text().isBlank()) {
            throw new IllegalStateException(
                    "No spoken content was detected in the media file"
            );
        }

        String fileName = file.getOriginalFilename() != null
                ? file.getOriginalFilename()
                : "uploaded-media";

        String defaultTitle = removeFileExtension(fileName);

        String title = requestedTitle == null
                || requestedTitle.isBlank()
                ? defaultTitle
                : requestedTitle.trim();

        String slug = requestedSlug == null
                || requestedSlug.isBlank()
                ? createSlug(title)
                : createSlug(requestedSlug);

        List<String> tags = buildTags(
                requestedTags,
                transcription.mediaType()
        );

        String transcriptMarkdown = buildTranscriptMarkdown(
                transcription
        );

        TextIngestionRequest ingestionRequest =
                new TextIngestionRequest(
                        slug,
                        title,
                        transcriptMarkdown,
                        tags
                );

        // Reuse the existing working put_page ingestion path.
        gbrainMcpService.ingestText(ingestionRequest);

        int segmentCount = transcription.segments() == null
                ? 0
                : transcription.segments().size();

        return new MediaIngestionResponse(
                true,
                slug,
                title,
                fileName,
                transcription.mediaType(),
                transcription.language(),
                transcription.durationSeconds(),
                segmentCount,
                "Media transcribed and ingested successfully"
        );
    }

    private String buildTranscriptMarkdown(
            TranscriptionResponse transcription
    ) {
        StringBuilder markdown = new StringBuilder();

        markdown.append("## Media Information\n\n");
        markdown.append("- **Original file:** ")
                .append(transcription.fileName())
                .append("\n");
        markdown.append("- **Media type:** ")
                .append(transcription.mediaType())
                .append("\n");
        markdown.append("- **Language:** ")
                .append(transcription.language())
                .append("\n");
        markdown.append("- **Duration:** ")
                .append(transcription.durationSeconds())
                .append(" seconds\n\n");

        markdown.append("## Transcript\n\n");

        if (transcription.segments() == null
                || transcription.segments().isEmpty()) {
            markdown.append(transcription.text())
                    .append("\n");

            return markdown.toString();
        }

        for (TranscriptionResponse.TranscriptSegment segment
                : transcription.segments()) {

            markdown.append("### ")
                    .append(valueOrDefault(
                            segment.startTime(),
                            "00:00:00"
                    ))
                    .append(" - ")
                    .append(valueOrDefault(
                            segment.endTime(),
                            "00:00:00"
                    ))
                    .append("\n\n");

            markdown.append(segment.text())
                    .append("\n\n");
        }

        return markdown.toString();
    }

    private List<String> buildTags(
            List<String> requestedTags,
            String mediaType
    ) {
        List<String> tags = new ArrayList<>();

        tags.add("media");
        tags.add("transcript");

        if (mediaType != null && !mediaType.isBlank()) {
            tags.add(mediaType.toLowerCase());
        }

        if (requestedTags != null) {
            requestedTags.stream()
                    .filter(tag -> tag != null && !tag.isBlank())
                    .map(String::trim)
                    .map(String::toLowerCase)
                    .filter(tag -> !tags.contains(tag))
                    .forEach(tags::add);
        }

        return tags;
    }

    private String createSlug(String value) {
        String slug = value.toLowerCase()
                .trim()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+", "")
                .replaceAll("-+$", "");

        if (slug.isBlank()) {
            return "media-transcript";
        }

        return slug;
    }

    private String removeFileExtension(String fileName) {
        int extensionPosition = fileName.lastIndexOf('.');

        if (extensionPosition <= 0) {
            return fileName;
        }

        return fileName.substring(0, extensionPosition);
    }

    private String valueOrDefault(
            String value,
            String defaultValue
    ) {
        return value == null || value.isBlank()
                ? defaultValue
                : value;
    }
}
