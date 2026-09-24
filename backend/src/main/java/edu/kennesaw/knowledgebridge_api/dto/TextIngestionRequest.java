package edu.kennesaw.knowledgebridge_api.dto;

import java.util.List;

public record TextIngestionRequest(
        String slug,
        String title,
        String content,
        List<String> tags
) {
}
