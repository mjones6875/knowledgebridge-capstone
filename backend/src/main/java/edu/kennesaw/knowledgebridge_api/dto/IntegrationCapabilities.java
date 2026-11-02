package edu.kennesaw.knowledgebridge_api.dto;

import java.util.List;

public record IntegrationCapabilities(
        String id,
        String name,
        List<String> capabilities
) {
}
