package edu.kennesaw.knowledgebridge_api.dto;

import java.util.List;

public record JiraSearchResponse(
        int returnedCount,
        boolean lastPage,
        List<JiraIssueSummary> issues
) {
}
