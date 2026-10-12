package edu.kennesaw.knowledgebridge_api.dto;

public record MediaIngestionResponse(
        boolean success,
        String slug,
        String title,
        String fileName,
        String mediaType,
        String language,
        Double durationSeconds,
        int transcriptSegments,
        String message
) {
}
