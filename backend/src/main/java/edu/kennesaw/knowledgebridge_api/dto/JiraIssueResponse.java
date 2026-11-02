package edu.kennesaw.knowledgebridge_api.dto;

public record JiraIssueResponse(
        String id,
        String key,
        String summary,
        String type,
        String status,
        String assignee,
        String priority,
        String updated,
        String description
) {
}