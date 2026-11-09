package edu.kennesaw.knowledgebridge_api.controller;

import edu.kennesaw.knowledgebridge_api.dto.JiraIssueResponse;
import edu.kennesaw.knowledgebridge_api.dto.JiraNaturalLanguageRequest;
import edu.kennesaw.knowledgebridge_api.dto.JiraSearchResponse;
import edu.kennesaw.knowledgebridge_api.service.AtlassianMcpService;
import edu.kennesaw.knowledgebridge_api.service.JiraNaturalLanguageService;
import io.modelcontextprotocol.spec.McpSchema;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/jira")
public class AtlassianController {

    private final AtlassianMcpService atlassianMcpService;
    private final JiraNaturalLanguageService naturalLanguageService;

    public AtlassianController(
            AtlassianMcpService atlassianMcpService,
            JiraNaturalLanguageService naturalLanguageService
    ) {
        this.atlassianMcpService = atlassianMcpService;
        this.naturalLanguageService = naturalLanguageService;
    }

    /**
     * Direct JQL search.
     */
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

    /**
     * Natural-language Jira search.
     */
    @PostMapping("/natural-search")
    public JiraSearchResponse naturalLanguageSearch(
            @RequestBody JiraNaturalLanguageRequest request
    ) {
        String jql = naturalLanguageService.convertToJql(
                request.query()
        );

        return atlassianMcpService.searchIssues(jql);
    }

    /**
     * Retrieves one formatted Jira issue.
     */
    @GetMapping("/issues/{issueKey}")
    public JiraIssueResponse getIssue(
            @PathVariable String issueKey
    ) {
        return atlassianMcpService.getIssue(issueKey);
    }

    /**
     * Retrieves the original MCP response for troubleshooting.
     */
    @GetMapping("/issues/{issueKey}/raw")
    public McpSchema.CallToolResult getIssueRaw(
            @PathVariable String issueKey
    ) {
        return atlassianMcpService.getIssueRaw(issueKey);
    }
}