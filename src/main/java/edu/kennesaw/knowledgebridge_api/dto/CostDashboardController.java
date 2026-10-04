package edu.kennesaw.knowledgebridge_api.controller;

import edu.kennesaw.knowledgebridge_api.dto.CostDashboardResponse;
import edu.kennesaw.knowledgebridge_api.service.CostTrackingService;
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
public class CostDashboardController {

    private final CostTrackingService costTrackingService;

    public CostDashboardController(
            CostTrackingService costTrackingService
    ) {
        this.costTrackingService = costTrackingService;
    }

    @GetMapping("/summary")
    public CostDashboardResponse getSummary() {
        return costTrackingService.getDashboard();
    }
}
