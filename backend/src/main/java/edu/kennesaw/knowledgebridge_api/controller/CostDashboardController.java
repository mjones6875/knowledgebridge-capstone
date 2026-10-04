package edu.kennesaw.knowledgebridge_api.controller;

import edu.kennesaw.knowledgebridge_api.dto.CostDashboardResponse;
import edu.kennesaw.knowledgebridge_api.service.CostTrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gbrain/cost")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://localhost:3001"
})
@Tag(
        name = "Cost Dashboard",
        description = "LLM token usage and estimated cost endpoints"
)
public class CostDashboardController {

    private final CostTrackingService costTrackingService;

    public CostDashboardController(
            CostTrackingService costTrackingService
    ) {
        this.costTrackingService = costTrackingService;
    }

    @GetMapping("/summary")
    @Operation(
            summary = "Get cost summary",
            description = "Returns request count, token usage, model breakdown, "
                    + "recent requests, and estimated LLM cost."
    )
    public CostDashboardResponse getSummary() {
        return costTrackingService.getDashboard();
    }
}