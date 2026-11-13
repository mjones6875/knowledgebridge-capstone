package edu.kennesaw.knowledgebridge_api.service;

import edu.kennesaw.knowledgebridge_api.client.GbrainClient;
import edu.kennesaw.knowledgebridge_api.dto.IntegrationCapabilities;
import edu.kennesaw.knowledgebridge_api.dto.IntegrationConnection;
import edu.kennesaw.knowledgebridge_api.dto.TranscriptionHealthResponse;
import edu.kennesaw.knowledgebridge_api.model.GbrainHealthResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IntegrationsServiceTest {

    @Mock
    private GbrainClient gbrainClient;

    @Mock
    private GbrainMcpService gbrainMcpService;

    @Mock
    private AtlassianMcpService atlassianMcpService;

    @Mock
    private TranscriptionClient transcriptionClient;

    private IntegrationsService service() {
        return new IntegrationsService(
                gbrainClient,
                gbrainMcpService,
                atlassianMcpService,
                transcriptionClient
        );
    }

    @Test
    void listConnections_returnsAllFourConnectionsNeverExposingCredentials() {
        when(gbrainClient.getHealth())
                .thenReturn(new GbrainHealthResponse("UP", "1.0", "openrouter"));
        when(atlassianMcpService.testConnection()).thenReturn(true);
        when(transcriptionClient.getHealth())
                .thenReturn(new TranscriptionHealthResponse("UP", "base.en", "cpu"));

        List<IntegrationConnection> connections = service().listConnections();

        assertThat(connections).hasSize(4);

        Map<String, IntegrationConnection> byId = connections.stream()
                .collect(Collectors.toMap(IntegrationConnection::id, c -> c));

        assertThat(byId.keySet())
                .containsExactlyInAnyOrder("gbrain", "atlassian", "transcription", "openrouter");

        assertThat(byId.get("gbrain").status()).isEqualTo("CONNECTED");
        assertThat(byId.get("gbrain").type()).isEqualTo("MCP");

        assertThat(byId.get("atlassian").status()).isEqualTo("CONNECTED");
        assertThat(byId.get("atlassian").type()).isEqualTo("MCP V2");

        assertThat(byId.get("transcription").status()).isEqualTo("CONNECTED");
        assertThat(byId.get("transcription").type()).isEqualTo("REST");

        assertThat(byId.get("openrouter").status()).isEqualTo("CONNECTED");
        assertThat(byId.get("openrouter").type()).isEqualTo("AI Provider");

        connections.forEach(connection ->
                assertThat(connection.detail()).doesNotContain("token", "Token", "password", "@")
        );
    }

    @Test
    void listConnections_reportsDisconnectedWhenADependencyFails() {
        when(gbrainClient.getHealth())
                .thenThrow(new RuntimeException("connection refused"));
        when(atlassianMcpService.testConnection()).thenReturn(false);
        when(transcriptionClient.getHealth())
                .thenThrow(new RuntimeException("timeout"));

        List<IntegrationConnection> connections = service().listConnections();

        Map<String, IntegrationConnection> byId = connections.stream()
                .collect(Collectors.toMap(IntegrationConnection::id, c -> c));

        assertThat(byId.get("gbrain").status()).isEqualTo("DISCONNECTED");
        assertThat(byId.get("atlassian").status()).isEqualTo("DISCONNECTED");
        assertThat(byId.get("transcription").status()).isEqualTo("DISCONNECTED");
        assertThat(byId.get("openrouter").status()).isEqualTo("DISCONNECTED");
    }

    @Test
    void testConnection_withUnknownId_throwsIllegalArgumentException() {
        IntegrationsService integrationsService = service();

        assertThrows(
                IllegalArgumentException.class,
                () -> integrationsService.testConnection("unknown-service")
        );
    }

    @Test
    void getCapabilities_withUnknownId_throwsIllegalArgumentException() {
        IntegrationsService integrationsService = service();

        assertThrows(
                IllegalArgumentException.class,
                () -> integrationsService.getCapabilities("unknown-service")
        );
    }

    @Test
    void getCapabilities_forTranscription_returnsSupportedOperations() {
        IntegrationCapabilities capabilities =
                service().getCapabilities("transcription");

        assertThat(capabilities.id()).isEqualTo("transcription");
        assertThat(capabilities.name()).isEqualTo("Transcription Service");
        assertThat(capabilities.capabilities())
                .contains(
                        "Audio transcription (mp3, wav, m4a)",
                        "Video transcription (mp4, mov, webm)",
                        "Automatic language detection"
                );
    }

    @Test
    void getCapabilities_forAtlassian_returnsRemoteMcpTools() {
        when(atlassianMcpService.listCapabilities())
                .thenReturn(List.of("searchJiraIssuesUsingJql"));

        IntegrationCapabilities capabilities =
                service().getCapabilities("atlassian");

        assertThat(capabilities.id()).isEqualTo("atlassian");
        assertThat(capabilities.name()).isEqualTo("Atlassian Jira");
        assertThat(capabilities.capabilities())
                .containsExactly("searchJiraIssuesUsingJql");
    }
}
