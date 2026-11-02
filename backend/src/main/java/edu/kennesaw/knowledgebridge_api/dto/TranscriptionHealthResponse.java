package edu.kennesaw.knowledgebridge_api.dto;

public record TranscriptionHealthResponse(
        String status,
        String model,
        String device
) {
}
