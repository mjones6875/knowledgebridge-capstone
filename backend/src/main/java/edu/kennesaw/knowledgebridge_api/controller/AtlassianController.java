package edu.kennesaw.knowledgebridge_api.controller;

import edu.kennesaw.knowledgebridge_api.dto.JiraIssueResponse;
import edu.kennesaw.knowledgebridge_api.dto.JiraSearchResponse;
import edu.kennesaw.knowledgebridge_api.service.AtlassianMcpService;
import io.modelcontextprotocol.spec.McpSchema;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/jira")
public class AtlassianController {

    private final AtlassianMcpService atlassianMcpService;

    public AtlassianController(
            AtlassianMcpService atlassianMcpService
    ) {
        this.atlassianMcpService = atlassianMcpService;
    }

    @GetMapping("/issues")
    public JiraSearchResponse searchIssues(
            @RequestParam(
                    defaultValue =
                            "project = KB ORDER BY created DESC"
            )
            String jql
    ) {
        return atlassianMcpService.searchIssues(jql);
    }

    @GetMapping("/issues/{issueKey}")
    public JiraIssueResponse getIssue(
            @PathVariable String issueKey
    ) {
        return atlassianMcpService.getIssue(issueKey);
    }

    @GetMapping("/issues/{issueKey}/raw")
    public McpSchema.CallToolResult getIssueRaw(
            @PathVariable String issueKey
    ) {
        return atlassianMcpService.getIssueRaw(issueKey);
    }
}