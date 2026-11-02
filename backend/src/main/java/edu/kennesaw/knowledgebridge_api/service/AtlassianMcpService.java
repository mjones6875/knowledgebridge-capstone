package edu.kennesaw.knowledgebridge_api.service;
import edu.kennesaw.knowledgebridge_api.dto.JiraIssueSummary;
import edu.kennesaw.knowledgebridge_api.dto.JiraSearchResponse;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.spec.McpSchema;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import edu.kennesaw.knowledgebridge_api.dto.JiraIssueResponse;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AtlassianMcpService {

    private final McpSyncClient atlassianClient;
    private final String cloudId;
    private final ObjectMapper objectMapper;
    public AtlassianMcpService(
            @Lazy
            @Qualifier("atlassianMcpClient")
            McpSyncClient atlassianClient,
            ObjectMapper objectMapper,
            @Value("${atlassian.cloud-id}") String cloudId
    ) {
        this.atlassianClient = atlassianClient;
        this.objectMapper = objectMapper;
        this.cloudId = cloudId;
    }

    public JiraSearchResponse searchIssues(String jql) {

        McpSchema.CallToolResult result = atlassianClient.callTool(
                new McpSchema.CallToolRequest(
                        "searchJiraIssuesUsingJql",
                        Map.of(
                                "cloudId", cloudId,
                                "jql", jql,
                                "fields", List.of(
                                        "summary",
                                        "status",
                                        "issuetype",
                                        "assignee",
                                        "priority",
                                        "updated"
                                ),
                                "maxResults", 50
                        )
                )
        );

        if (Boolean.TRUE.equals(result.isError())) {
            throw new IllegalStateException(
                    "Unable to search Jira issues: " + extractText(result)
            );
        }

        try {
            JsonNode root = objectMapper.readTree(extractText(result));
            JsonNode data = root.path("data");

            List<JiraIssueSummary> issues = new ArrayList<>();

            data.path("issues").forEach(issueNode -> {
                JsonNode fields = issueNode.path("fields");

                issues.add(
                        new JiraIssueSummary(
                                issueNode.path("id").asText(),
                                issueNode.path("key").asText(),
                                fields.path("summary").asText(),
                                nullableText(
                                        fields.path("issuetype"),
                                        "name"
                                ),
                                nullableText(
                                        fields.path("status"),
                                        "name"
                                ),
                                nullableText(
                                        fields.path("assignee"),
                                        "displayName"
                                ),
                                nullableText(
                                        fields.path("priority"),
                                        "name"
                                ),
                                nullableValue(fields.path("updated"))
                        )
                );
            });

            return new JiraSearchResponse(
                    issues.size(),
                    data.path("isLast").asBoolean(true),
                    issues
            );

        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to parse Jira search response",
                    exception
            );
        }
    }

    public JiraIssueResponse getIssue(String issueKey) {

        // getJiraIssue ignores the "fields" filter and always returns a
        // fixed subset (no issuetype/description), so the issue is instead
        // looked up via the search tool, which does honor custom fields.
        McpSchema.CallToolResult result = atlassianClient.callTool(
                new McpSchema.CallToolRequest(
                        "searchJiraIssuesUsingJql",
                        Map.of(
                                "cloudId", cloudId,
                                "jql", "key = \"" + escapeJql(issueKey) + "\"",
                                "fields", List.of(
                                        "summary",
                                        "description",
                                        "issuetype",
                                        "status",
                                        "assignee",
                                        "priority",
                                        "updated"
                                ),
                                "maxResults", 1
                        )
                )
        );

        if (Boolean.TRUE.equals(result.isError())) {
            throw new IllegalStateException(
                    "Unable to retrieve Jira issue: " + extractText(result)
            );
        }

        try {
            JsonNode root = objectMapper.readTree(extractText(result));
            JsonNode issues = root.path("data").path("issues");

            if (!issues.isArray() || issues.isEmpty()) {
                throw new IllegalStateException(
                        "Jira issue not found: " + issueKey
                );
            }

            JsonNode issueNode = issues.get(0);
            JsonNode fields = issueNode.path("fields");

            return new JiraIssueResponse(
                    issueNode.path("id").asText(),
                    issueNode.path("key").asText(),
                    fields.path("summary").asText(),
                    nullableText(fields.path("issuetype"), "name"),
                    nullableText(fields.path("status"), "name"),
                    nullableText(fields.path("assignee"), "displayName"),
                    nullableText(fields.path("priority"), "name"),
                    nullableValue(fields.path("updated")),
                    extractDescription(fields.path("description"))
            );

        } catch (IllegalStateException alreadyMapped) {
            throw alreadyMapped;
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to parse Jira issue response",
                    exception
            );
        }
    }

    /**
     * Returns the raw MCP tool result for a single issue, unparsed. Intended
     * for diagnosing the exact JSON shape the Atlassian remote MCP server
     * returns (mirrors the gBrain "-raw" debug endpoints).
     */
    public McpSchema.CallToolResult getIssueRaw(String issueKey) {
        return atlassianClient.callTool(
                new McpSchema.CallToolRequest(
                        "getJiraIssue",
                        Map.of(
                                "cloudId", cloudId,
                                "issueIdOrKey", issueKey
                        )
                )
        );
    }

    private String escapeJql(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    /**
     * Pings the Atlassian remote MCP server by listing its tools. This is
     * also what lazily triggers the underlying client connection/handshake
     * the first time it is called.
     */
    public boolean testConnection() {
        try {
            atlassianClient.listTools();
            return true;
        } catch (Exception exception) {
            return false;
        }
    }

    public List<String> listCapabilities() {
        return atlassianClient.listTools()
                .tools()
                .stream()
                .map(tool ->
                        tool.description() != null && !tool.description().isBlank()
                                ? tool.name() + " — " + tool.description()
                                : tool.name()
                )
                .toList();
    }

    private String extractText(McpSchema.CallToolResult result) {
        return result.content()
                .stream()
                .filter(McpSchema.TextContent.class::isInstance)
                .map(McpSchema.TextContent.class::cast)
                .map(McpSchema.TextContent::text)
                .findFirst()
                .orElse("{}");
    }

    /**
     * Jira Cloud returns "description" as Atlassian Document Format (ADF)
     * JSON rather than plain text. This walks the ADF node tree and joins
     * the text runs, inserting a newline after block-level nodes.
     */
    private String extractDescription(JsonNode descriptionNode) {
        if (descriptionNode == null
                || descriptionNode.isNull()
                || descriptionNode.isMissingNode()) {
            return null;
        }

        if (descriptionNode.isTextual()) {
            String text = descriptionNode.asText();
            return text.isBlank() ? null : text;
        }

        StringBuilder builder = new StringBuilder();
        appendAdfText(descriptionNode, builder);

        String text = builder.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private void appendAdfText(JsonNode node, StringBuilder builder) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return;
        }

        JsonNode text = node.path("text");
        if (text.isTextual()) {
            builder.append(text.asText());
        }

        JsonNode content = node.path("content");
        if (content.isArray()) {
            content.forEach(child -> appendAdfText(child, builder));
        }

        String type = node.path("type").asText("");
        if (type.equals("paragraph")
                || type.equals("heading")
                || type.equals("listItem")) {
            builder.append("\n");
        }
    }

    private String nullableText(JsonNode parent, String fieldName) {
        if (parent == null || parent.isNull() || parent.isMissingNode()) {
            return null;
        }

        JsonNode value = parent.path(fieldName);

        return value.isMissingNode() || value.isNull()
                ? null
                : value.asText();
    }

    private String nullableValue(JsonNode value) {
        return value == null
                || value.isNull()
                || value.isMissingNode()
                ? null
                : value.asText();
    }
}