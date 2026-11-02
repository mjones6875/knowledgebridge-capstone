package edu.kennesaw.knowledgebridge_api.dto;

/**
 * Read-only summary of a configured service connection, shown on the
 * administrator-facing Integrations page. Never carries tokens or
 * credentials; "detail" is a short human-readable status note only.
 */
public record IntegrationConnection(
        String id,
        String name,
        String type,
        String status,
        String purpose,
        String detail
) {
}
