package edu.kennesaw.knowledgebridge_api.dto;

public record IngestResponse(
        boolean success,
        String slug,
        String title,
        String fileName,
        String sourceType,
        String message
) {
}