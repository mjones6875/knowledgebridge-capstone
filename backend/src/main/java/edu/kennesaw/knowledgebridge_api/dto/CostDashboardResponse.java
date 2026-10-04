package edu.kennesaw.knowledgebridge_api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record CostDashboardResponse(
        long totalRequests,
        long totalInputTokens,
        long totalOutputTokens,
        long totalTokens,
        BigDecimal estimatedCostUsd,
        Map<String, ModelSummary> modelBreakdown,
        List<UsageEvent> recentRequests
) {

    public record ModelSummary(
            long requests,
            long inputTokens,
            long outputTokens,
            long totalTokens,
            BigDecimal estimatedCostUsd
    ) {
    }

    public record UsageEvent(
            String id,
            Instant timestamp,
            String operation,
            String model,
            long inputTokens,
            long outputTokens,
            long totalTokens,
            BigDecimal estimatedCostUsd
    ) {
    }
}
