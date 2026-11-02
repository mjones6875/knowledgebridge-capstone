package edu.kennesaw.knowledgebridge_api.controller;

import edu.kennesaw.knowledgebridge_api.dto.IntegrationCapabilities;
import edu.kennesaw.knowledgebridge_api.dto.IntegrationConnection;
import edu.kennesaw.knowledgebridge_api.service.IntegrationsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read-only view of the configured service connections (gBrain, Atlassian
 * Jira, the transcription service, and OpenRouter) for the administrator
 * -facing Integrations page. Deliberately separate from the business-data
 * endpoints under /api/jira and /api/gbrain.
 */
@RestController
@RequestMapping("/api/integrations")
@Tag(
        name = "Integrations",
        description = "Connection status for configured MCP/REST/AI-provider services"
)
public class IntegrationsController {

    private final IntegrationsService integrationsService;

    public IntegrationsController(IntegrationsService integrationsService) {
        this.integrationsService = integrationsService;
    }

    @GetMapping
    @Operation(
            summary = "List configured connections",
            description = "Returns status and purpose for each configured service connection."
    )
    public List<IntegrationConnection> listConnections() {
        return integrationsService.listConnections();
    }

    @PostMapping("/{id}/test")
    @Operation(
            summary = "Test a connection",
            description = "Re-checks a single connection and returns its current status."
    )
    public IntegrationConnection testConnection(@PathVariable String id) {
        return integrationsService.testConnection(id);
    }

    @GetMapping("/{id}/capabilities")
    @Operation(
            summary = "View supported capabilities",
            description = "Returns the capabilities (tools/operations) supported by a connection."
    )
    public IntegrationCapabilities getCapabilities(@PathVariable String id) {
        return integrationsService.getCapabilities(id);
    }
}
