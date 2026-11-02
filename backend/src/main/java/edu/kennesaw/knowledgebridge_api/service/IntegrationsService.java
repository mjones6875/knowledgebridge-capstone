package edu.kennesaw.knowledgebridge_api.service;

import edu.kennesaw.knowledgebridge_api.client.GbrainClient;
import edu.kennesaw.knowledgebridge_api.dto.IntegrationCapabilities;
import edu.kennesaw.knowledgebridge_api.dto.IntegrationConnection;
import edu.kennesaw.knowledgebridge_api.dto.TranscriptionHealthResponse;
import edu.kennesaw.knowledgebridge_api.model.GbrainHealthResponse;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Aggregates read-only health/status information for every configured
 * service connection (MCP and REST alike) so the Integrations page can
 * show what is wired up without exposing tokens or credentials.
 */
@Service
public class IntegrationsService {

    private static final String STATUS_CONNECTED = "CONNECTED";
    private static final String STATUS_DISCONNECTED = "DISCONNECTED";

    private final GbrainClient gbrainClient;
    private final GbrainMcpService gbrainMcpService;
    private final AtlassianMcpService atlassianMcpService;
    private final TranscriptionClient transcriptionClient;

    public IntegrationsService(
            GbrainClient gbrainClient,
            GbrainMcpService gbrainMcpService,
            AtlassianMcpService atlassianMcpService,
            TranscriptionClient transcriptionClient
    ) {
        this.gbrainClient = gbrainClient;
        this.gbrainMcpService = gbrainMcpService;
        this.atlassianMcpService = atlassianMcpService;
        this.transcriptionClient = transcriptionClient;
    }

    public List<IntegrationConnection> listConnections() {
        return List.of(
                checkGbrain(),
                checkAtlassian(),
                checkTranscription(),
                checkOpenRouter()
        );
    }

    public IntegrationConnection testConnection(String id) {
        return switch (id) {
            case "gbrain" -> checkGbrain();
            case "atlassian" -> checkAtlassian();
            case "transcription" -> checkTranscription();
            case "openrouter" -> checkOpenRouter();
            default -> throw new IllegalArgumentException(
                    "Unknown integration: " + id
            );
        };
    }

    public IntegrationCapabilities getCapabilities(String id) {
        return switch (id) {
            case "gbrain" -> new IntegrationCapabilities(
                    "gbrain",
                    "gBrain",
                    gbrainMcpService.listTools()
                            .stream()
                            .map(tool ->
                                    tool.description() != null && !tool.description().isBlank()
                                            ? tool.name() + " — " + tool.description()
                                            : tool.name()
                            )
                            .toList()
            );

            case "atlassian" -> new IntegrationCapabilities(
                    "atlassian",
                    "Atlassian Jira",
                    atlassianMcpService.listCapabilities()
            );

            case "transcription" -> new IntegrationCapabilities(
                    "transcription",
                    "Transcription Service",
                    List.of(
                            "Audio transcription (mp3, wav, m4a)",
                            "Video transcription (mp4, mov, webm)",
                            "Automatic language detection"
                    )
            );

            case "openrouter" -> new IntegrationCapabilities(
                    "openrouter",
                    "OpenRouter",
                    List.of(
                            "Chat completions for Q&A answers",
                            "Text embeddings for semantic search"
                    )
            );

            default -> throw new IllegalArgumentException(
                    "Unknown integration: " + id
            );
        };
    }

    private IntegrationConnection checkGbrain() {
        try {
            GbrainHealthResponse health = gbrainClient.getHealth();

            String detail = health.engine() != null && !health.engine().isBlank()
                    ? "Engine: " + health.engine()
                    : "Version " + health.version();

            return new IntegrationConnection(
                    "gbrain",
                    "gBrain",
                    "MCP",
                    STATUS_CONNECTED,
                    "Knowledge ingestion and retrieval",
                    detail
            );
        } catch (Exception exception) {
            return new IntegrationConnection(
                    "gbrain",
                    "gBrain",
                    "MCP",
                    STATUS_DISCONNECTED,
                    "Knowledge ingestion and retrieval",
                    "Unable to reach gBrain: " + exception.getMessage()
            );
        }
    }

    private IntegrationConnection checkAtlassian() {
        boolean connected = atlassianMcpService.testConnection();

        return new IntegrationConnection(
                "atlassian",
                "Atlassian Jira",
                "MCP V2",
                connected ? STATUS_CONNECTED : STATUS_DISCONNECTED,
                "Project work items",
                connected
                        ? "Reachable via the Atlassian remote MCP server"
                        : "Unable to reach the Atlassian MCP server"
        );
    }

    private IntegrationConnection checkTranscription() {
        try {
            TranscriptionHealthResponse health = transcriptionClient.getHealth();

            return new IntegrationConnection(
                    "transcription",
                    "Transcription Service",
                    "REST",
                    STATUS_CONNECTED,
                    "Audio/video transcription",
                    "Model: " + health.model()
            );
        } catch (Exception exception) {
            return new IntegrationConnection(
                    "transcription",
                    "Transcription Service",
                    "REST",
                    STATUS_DISCONNECTED,
                    "Audio/video transcription",
                    "Unable to reach the transcription service: " + exception.getMessage()
            );
        }
    }

    private IntegrationConnection checkOpenRouter() {
        // The backend has no direct OpenRouter credentials of its own;
        // OpenRouter is only called from inside the gBrain container, so
        // its reachability is inferred from gBrain's own health check.
        try {
            gbrainClient.getHealth();

            return new IntegrationConnection(
                    "openrouter",
                    "OpenRouter",
                    "AI Provider",
                    STATUS_CONNECTED,
                    "Embeddings and LLM answers",
                    "Status inferred from gBrain's reported connectivity"
            );
        } catch (Exception exception) {
            return new IntegrationConnection(
                    "openrouter",
                    "OpenRouter",
                    "AI Provider",
                    STATUS_DISCONNECTED,
                    "Embeddings and LLM answers",
                    "Unable to verify via gBrain: " + exception.getMessage()
            );
        }
    }
}
