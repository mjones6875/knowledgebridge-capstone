package edu.kennesaw.knowledgebridge_api.dto;

import java.util.List;

public record SearchResponse(
        String query,
        String searchMode,
        List<GbrainSearchHit> results
) {
}