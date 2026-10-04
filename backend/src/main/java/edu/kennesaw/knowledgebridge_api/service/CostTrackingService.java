package edu.kennesaw.knowledgebridge_api.service;

import edu.kennesaw.knowledgebridge_api.dto.CostDashboardResponse;
import edu.kennesaw.knowledgebridge_api.dto.CostDashboardResponse.ModelSummary;
import edu.kennesaw.knowledgebridge_api.dto.CostDashboardResponse.UsageEvent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
public class CostTrackingService {

    private static final BigDecimal ONE_MILLION =
            BigDecimal.valueOf(1_000_000);

    private static final int MAX_EVENTS = 500;
    private static final int RECENT_EVENT_LIMIT = 20;

    private final ConcurrentLinkedDeque<UsageEvent> events =
            new ConcurrentLinkedDeque<>();

    private final BigDecimal inputPricePerMillion;
    private final BigDecimal outputPricePerMillion;

    public CostTrackingService(
            @Value("${knowledgebridge.cost.input-per-million:1.00}")
            BigDecimal inputPricePerMillion,

            @Value("${knowledgebridge.cost.output-per-million:5.00}")
            BigDecimal outputPricePerMillion
    ) {
        this.inputPricePerMillion = inputPricePerMillion;
        this.outputPricePerMillion = outputPricePerMillion;
    }

    public void recordUsage(
            String operation,
            String model,
            long inputTokens,
            long outputTokens
    ) {
        long safeInputTokens = Math.max(inputTokens, 0);
        long safeOutputTokens = Math.max(outputTokens, 0);
        long totalTokens = safeInputTokens + safeOutputTokens;

        BigDecimal estimatedCost = calculateCost(
                safeInputTokens,
                safeOutputTokens
        );

        UsageEvent event = new UsageEvent(
                UUID.randomUUID().toString(),
                Instant.now(),
                operation,
                model == null || model.isBlank() ? "unknown" : model,
                safeInputTokens,
                safeOutputTokens,
                totalTokens,
                estimatedCost
        );

        events.addFirst(event);

        while (events.size() > MAX_EVENTS) {
            events.pollLast();
        }
    }

    public CostDashboardResponse getDashboard() {
        List<UsageEvent> snapshot = new ArrayList<>(events);

        long totalInputTokens = snapshot.stream()
                .mapToLong(UsageEvent::inputTokens)
                .sum();

        long totalOutputTokens = snapshot.stream()
                .mapToLong(UsageEvent::outputTokens)
                .sum();

        BigDecimal totalCost = snapshot.stream()
                .map(UsageEvent::estimatedCostUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, List<UsageEvent>> groupedEvents =
                new LinkedHashMap<>();

        for (UsageEvent event : snapshot) {
            groupedEvents
                    .computeIfAbsent(
                            event.model(),
                            ignored -> new ArrayList<>()
                    )
                    .add(event);
        }

        Map<String, ModelSummary> modelBreakdown =
                new LinkedHashMap<>();

        groupedEvents.forEach((model, modelEvents) -> {
            long modelInputTokens = modelEvents.stream()
                    .mapToLong(UsageEvent::inputTokens)
                    .sum();

            long modelOutputTokens = modelEvents.stream()
                    .mapToLong(UsageEvent::outputTokens)
                    .sum();

            BigDecimal modelCost = modelEvents.stream()
                    .map(UsageEvent::estimatedCostUsd)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            modelBreakdown.put(
                    model,
                    new ModelSummary(
                            modelEvents.size(),
                            modelInputTokens,
                            modelOutputTokens,
                            modelInputTokens + modelOutputTokens,
                            modelCost.setScale(8, RoundingMode.HALF_UP)
                    )
            );
        });

        List<UsageEvent> recentRequests = snapshot.stream()
                .limit(RECENT_EVENT_LIMIT)
                .toList();

        return new CostDashboardResponse(
                snapshot.size(),
                totalInputTokens,
                totalOutputTokens,
                totalInputTokens + totalOutputTokens,
                totalCost.setScale(8, RoundingMode.HALF_UP),
                modelBreakdown,
                recentRequests
        );
    }

    private BigDecimal calculateCost(
            long inputTokens,
            long outputTokens
    ) {
        BigDecimal inputCost = BigDecimal.valueOf(inputTokens)
                .multiply(inputPricePerMillion)
                .divide(ONE_MILLION, 10, RoundingMode.HALF_UP);

        BigDecimal outputCost = BigDecimal.valueOf(outputTokens)
                .multiply(outputPricePerMillion)
                .divide(ONE_MILLION, 10, RoundingMode.HALF_UP);

        return inputCost
                .add(outputCost)
                .setScale(8, RoundingMode.HALF_UP);
    }
}
