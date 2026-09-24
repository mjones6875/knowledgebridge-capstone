package edu.kennesaw.knowledgebridge_api.model;

public record GbrainHealthResponse(
        String status,
        String version,
        String engine
) {
}
