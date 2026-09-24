package edu.kennesaw.knowledgebridge_api.dto;

import java.util.List;

public record AnswerResponse(
        String question,
        String answer,
        List<Citation> citations,
        List<String> gaps,
        String modelUsed,
        TokenUsage usage
) {
    public record Citation(
            String pageSlug,
            Integer rowNumber,
            Integer citationIndex
    ) {
    }

    public record TokenUsage(
            int inputTokens,
            int outputTokens
    ) {
    }
}