package edu.kennesaw.knowledgebridge_api.service;

import edu.kennesaw.knowledgebridge_api.dto.JiraIssueResponse;
import edu.kennesaw.knowledgebridge_api.dto.JiraSearchResponse;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.spec.McpSchema;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AtlassianMcpServiceTest {

    @Mock
    private McpSyncClient atlassianClient;

    @Test
    void searchIssues_parsesIssueSummariesAndPaginationState() {
        String json = """
                {
                  "data": {
                    "isLast": false,
                    "issues": [
                      {
                        "id": "10001",
                        "key": "KB-11",
                        "fields": {
                          "summary": "Large transcript timeout",
                          "issuetype": {"name": "Bug"},
                          "status": {"name": "In Progress"},
                          "assignee": {"displayName": "Jamie Lee"},
                          "priority": {"name": "High"},
                          "updated": "2026-01-01T00:00:00.000+0000"
                        }
                      },
                      {
                        "id": "10002",
                        "key": "KB-12",
                        "fields": {
                          "summary": "Unassigned task",
                          "status": {"name": "To Do"}
                        }
                      }
                    ]
                  }
                }
                """;

        when(atlassianClient.callTool(any()))
                .thenReturn(new McpSchema.CallToolResult(
                        List.of(new McpSchema.TextContent(json)),
                        false,
                        null,
                        null
                ));

        AtlassianMcpService service = new AtlassianMcpService(
                atlassianClient,
                new ObjectMapper(),
                "test-cloud-id"
        );

        JiraSearchResponse response = service.searchIssues("project = KB");

        assertThat(response.returnedCount()).isEqualTo(2);
        assertThat(response.lastPage()).isFalse();
        assertThat(response.issues()).hasSize(2);
        assertThat(response.issues().get(0).key()).isEqualTo("KB-11");
        assertThat(response.issues().get(0).type()).isEqualTo("Bug");
        assertThat(response.issues().get(0).assignee()).isEqualTo("Jamie Lee");
        assertThat(response.issues().get(1).status()).isEqualTo("To Do");
        assertThat(response.issues().get(1).assignee()).isNull();
        assertThat(response.issues().get(1).priority()).isNull();
    }

    @Test
    void searchIssues_whenMcpReturnsError_throwsIllegalStateException() {
        when(atlassianClient.callTool(any()))
                .thenReturn(new McpSchema.CallToolResult(
                        List.of(new McpSchema.TextContent("Jira unavailable")),
                        true,
                        null,
                        null
                ));

        AtlassianMcpService service = new AtlassianMcpService(
                atlassianClient,
                new ObjectMapper(),
                "test-cloud-id"
        );

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.searchIssues("project = KB")
        );

        assertThat(exception).hasMessageContaining("Jira unavailable");
    }

    @Test
    void getIssue_extractsTypeAndPlainTextDescriptionFromAdf() {
        String json = """
                {
                  "data": {
                    "issues": [
                      {
                        "id": "10001",
                        "key": "KB-11",
                        "fields": {
                          "summary": "Large transcript timeout",
                          "issuetype": {"name": "Bug"},
                          "status": {"name": "To Do"},
                          "assignee": {"displayName": "Jamie Lee"},
                          "priority": {"name": "High"},
                          "updated": "2026-01-01T00:00:00.000+0000",
                          "description": {
                            "type": "doc",
                            "content": [
                              {
                                "type": "paragraph",
                                "content": [
                                  {"type": "text", "text": "Transcription times out"},
                                  {"type": "text", "text": " on large files."}
                                ]
                              }
                            ]
                          }
                        }
                      }
                    ]
                  }
                }
                """;

        when(atlassianClient.callTool(any()))
                .thenReturn(new McpSchema.CallToolResult(
                        List.of(new McpSchema.TextContent(json)),
                        false,
                        null,
                        null
                ));

        AtlassianMcpService service = new AtlassianMcpService(
                atlassianClient,
                new ObjectMapper(),
                "test-cloud-id"
        );

        JiraIssueResponse issue = service.getIssue("KB-11");

        assertThat(issue.key()).isEqualTo("KB-11");
        assertThat(issue.type()).isEqualTo("Bug");
        assertThat(issue.status()).isEqualTo("To Do");
        assertThat(issue.assignee()).isEqualTo("Jamie Lee");
        assertThat(issue.priority()).isEqualTo("High");
        assertThat(issue.description()).isEqualTo("Transcription times out on large files.");
    }

    @Test
    void getIssue_withPlainTextDescription_returnsItUnchanged() {
        String json = """
                {
                  "data": {
                    "issues": [
                      {
                        "id": "10002",
                        "key": "KB-12",
                        "fields": {
                          "summary": "Legacy issue",
                          "issuetype": {"name": "Task"},
                          "status": {"name": "Done"},
                          "updated": "2026-01-01T00:00:00.000+0000",
                          "description": "Plain legacy description"
                        }
                      }
                    ]
                  }
                }
                """;

        when(atlassianClient.callTool(any()))
                .thenReturn(new McpSchema.CallToolResult(
                        List.of(new McpSchema.TextContent(json)),
                        false,
                        null,
                        null
                ));

        AtlassianMcpService service = new AtlassianMcpService(
                atlassianClient,
                new ObjectMapper(),
                "test-cloud-id"
        );

        JiraIssueResponse issue = service.getIssue("KB-12");

        assertThat(issue.assignee()).isNull();
        assertThat(issue.description()).isEqualTo("Plain legacy description");
    }

    @Test
    void getIssue_whenNoIssuesReturned_throwsIllegalStateException() {
        String json = """
                {
                  "data": {
                    "issues": []
                  }
                }
                """;

        when(atlassianClient.callTool(any()))
                .thenReturn(new McpSchema.CallToolResult(
                        List.of(new McpSchema.TextContent(json)),
                        false,
                        null,
                        null
                ));

        AtlassianMcpService service = new AtlassianMcpService(
                atlassianClient,
                new ObjectMapper(),
                "test-cloud-id"
        );

        assertThrows(
                IllegalStateException.class,
                () -> service.getIssue("KB-404")
        );
    }

    @Test
    void testConnection_returnsFalseWhenMcpClientThrows() {
        when(atlassianClient.listTools())
                .thenThrow(new RuntimeException("unreachable"));

        AtlassianMcpService service = new AtlassianMcpService(
                atlassianClient,
                new ObjectMapper(),
                "test-cloud-id"
        );

        assertThat(service.testConnection()).isFalse();
    }
}
