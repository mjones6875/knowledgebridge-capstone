package edu.kennesaw.knowledgebridge_api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GbrainSearchHit(
        String slug,

        @JsonProperty("page_id")
        Long pageId,

        String title,
        String type,

        @JsonProperty("chunk_text")
        String chunkText,

        Double score
) {
}