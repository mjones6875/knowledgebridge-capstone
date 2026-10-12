package edu.kennesaw.knowledgebridge_api.dto;

import java.util.List;

public record TranscriptionResponse(
        Boolean success,
        String fileName,
        String mediaType,
        String language,
        Double languageProbability,
        Double durationSeconds,
        String text,
        List<TranscriptSegment> segments
) {
    public record TranscriptSegment(
            Double startSeconds,
            Double endSeconds,
            String startTime,
            String endTime,
            String text
    ) {
    }
}