package edu.kennesaw.knowledgebridge_api.service;

import edu.kennesaw.knowledgebridge_api.dto.*;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.spec.McpSchema;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class GbrainMcpService {

    private final McpSyncClient gbrainClient;
    private final ObjectMapper objectMapper;

    public GbrainMcpService(
            McpSyncClient gbrainClient,
            ObjectMapper objectMapper
    ) {
        this.gbrainClient = gbrainClient;
        this.objectMapper = objectMapper;
    }

    public SearchResponse search(String query) {

        McpSchema.CallToolResult mcpResult = gbrainClient.callTool(
                new McpSchema.CallToolRequest(
                        "query",
                        Map.of(
                                "query", query,
                                "source_id", "default",
                                "expand", false,
                                "limit", 10
                        )
                )
        );

        if (Boolean.TRUE.equals(mcpResult.isError())) {
            throw new IllegalStateException(
                    "gBrain search failed: " + extractText(mcpResult)
            );
        }

        try {
            String rawJson = extractText(mcpResult);

            List<GbrainSearchHit> results = objectMapper.readValue(
                    rawJson,
                    new TypeReference<>() {
                    }
            );

            return new SearchResponse(
                    query,
                    "hybrid",
                    results
            );

        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to parse the gBrain response",
                    exception
            );
        }
    }

    private String extractText(McpSchema.CallToolResult result) {
        return result.content()
                .stream()
                .filter(McpSchema.TextContent.class::isInstance)
                .map(McpSchema.TextContent.class::cast)
                .map(McpSchema.TextContent::text)
                .findFirst()
                .orElse("[]");
    }

    public Object getToolDefinition(String toolName) {
        return gbrainClient.listTools()
                .tools()
                .stream()
                .filter(tool -> toolName.equals(tool.name()))
                .findFirst()
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "gBrain tool not found: " + toolName
                        )
                );
    }

    public McpSchema.CallToolResult ingestText(
            TextIngestionRequest request
    ) {
        validateTextIngestionRequest(request);

        String markdown = buildMarkdown(request);

        McpSchema.CallToolResult result = gbrainClient.callTool(
                new McpSchema.CallToolRequest(
                        "put_page",
                        Map.of(
                                "slug", request.slug(),
                                "content", markdown
                        )
                )
        );

        if (Boolean.TRUE.equals(result.isError())) {
            throw new IllegalStateException(
                    "gBrain ingestion failed: " + extractText(result)
            );
        }

        return result;
    }

    private void validateTextIngestionRequest(
            TextIngestionRequest request
    ) {
        if (request == null) {
            throw new IllegalArgumentException(
                    "Request body is required"
            );
        }

        if (request.slug() == null ||
                !request.slug().matches(
                        "^[a-z0-9]+(?:-[a-z0-9]+)*$"
                )) {
            throw new IllegalArgumentException(
                    "Slug must contain lowercase letters, numbers and hyphens only"
            );
        }

        if (request.title() == null ||
                request.title().isBlank()) {
            throw new IllegalArgumentException(
                    "Title is required"
            );
        }

        if (request.content() == null ||
                request.content().isBlank()) {
            throw new IllegalArgumentException(
                    "Content is required"
            );
        }
    }

    private String buildMarkdown(TextIngestionRequest request) {
        StringBuilder markdown = new StringBuilder();

        markdown.append("---\n");
        markdown.append("title: ")
                .append(yamlQuote(request.title()))
                .append("\n");
        markdown.append("type: note\n");

        if (request.tags() != null &&
                !request.tags().isEmpty()) {
            markdown.append("tags:\n");

            request.tags().stream()
                    .filter(tag -> tag != null && !tag.isBlank())
                    .forEach(tag -> markdown
                            .append("  - ")
                            .append(yamlQuote(tag))
                            .append("\n"));
        }

        markdown.append("---\n\n");
        markdown.append("# ")
                .append(request.title().replace("\n", " "))
                .append("\n\n");
        markdown.append(request.content().trim())
                .append("\n");

        return markdown.toString();
    }

    private String yamlQuote(String value) {
        return "\""
                + value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", " ")
                .replace("\n", " ")
                + "\"";
    }

    public List<McpSchema.Tool> listTools() {
        return gbrainClient.listTools().tools();
    }

    public McpSchema.CallToolResult listPages() {
        return gbrainClient.callTool(
                new McpSchema.CallToolRequest(
                        "list_pages",
                        Map.of("limit", 10)
                )
        );
    }

    public McpSchema.CallToolResult queryRaw(String query) {
        return gbrainClient.callTool(
                new McpSchema.CallToolRequest(
                        "query",
                        Map.of(
                                "query", query,
                                "source_id", "default",
                                "expand", false,
                                "limit", 10
                        )
                )
        );
    }

    public AnswerResponse answer(String question) {

        McpSchema.CallToolResult result = callThink(question);

        if (Boolean.TRUE.equals(result.isError())) {
            throw new IllegalStateException(
                    "gBrain answer generation failed: " + extractText(result)
            );
        }

        try {
            String rawJson = extractText(result);
            JsonNode root = objectMapper.readTree(rawJson);

            List<AnswerResponse.Citation> citations = new ArrayList<>();

            root.path("citations").forEach(citation -> {
                Integer rowNumber = citation.path("row_num").isNull()
                        ? null
                        : citation.path("row_num").asInt();

                citations.add(
                        new AnswerResponse.Citation(
                                citation.path("page_slug").asText(),
                                rowNumber,
                                citation.path("citation_index").asInt()
                        )
                );
            });

            List<String> gaps = new ArrayList<>();
            root.path("gaps").forEach(
                    gap -> gaps.add(gap.asText())
            );

            JsonNode usageNode = root.path("usage");

            AnswerResponse.TokenUsage usage =
                    new AnswerResponse.TokenUsage(
                            usageNode.path("input_tokens").asInt(),
                            usageNode.path("output_tokens").asInt()
                    );

            return new AnswerResponse(
                    root.path("question").asText(),
                    root.path("answer").asText(),
                    citations,
                    gaps,
                    root.path("modelUsed").asText(),
                    usage
            );

        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to parse the gBrain synthesized response",
                    exception
            );
        }
    }

    public McpSchema.CallToolResult answerRaw(String question) {
        return callThink(question);
    }

    private McpSchema.CallToolResult callThink(String question) {
        return gbrainClient.callTool(
                new McpSchema.CallToolRequest(
                        "think",
                        Map.of("question", question)
                )
        );
    }

    public IngestResponse ingestFile(
            MultipartFile file,
            String requestedTitle
    ) {
        validateFile(file);

        String originalFileName = file.getOriginalFilename();

        try {
            String extractedText = new String(
                    file.getBytes(),
                    StandardCharsets.UTF_8
            );

            if (extractedText.isBlank()) {
                throw new IllegalArgumentException(
                        "The uploaded file does not contain any text"
                );
            }

            String title = requestedTitle == null || requestedTitle.isBlank()
                    ? createTitleFromFileName(originalFileName)
                    : requestedTitle.trim();

            String slug = createSlug(title);

            String markdownContent = """
                ---
                title: "%s"
                source_file: "%s"
                source_type: file
                ---

                # %s

                %s
                """.formatted(
                    escapeYaml(title),
                    escapeYaml(originalFileName),
                    title,
                    extractedText.trim()
            );

            McpSchema.CallToolResult mcpResult = gbrainClient.callTool(
                    new McpSchema.CallToolRequest(
                            "put_page",
                            Map.of(
                                    "slug", slug,
                                    "content", markdownContent
                            )
                    )
            );

            if (Boolean.TRUE.equals(mcpResult.isError())) {
                throw new IllegalStateException(
                        "gBrain ingestion failed: " + extractText(mcpResult)
                );
            }

            return new IngestResponse(
                    true,
                    slug,
                    title,
                    originalFileName,
                    "file",
                    "File ingested successfully"
            );

        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to ingest the uploaded file",
                    exception
            );
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(
                    "Please select a non-empty file"
            );
        }

        String fileName = file.getOriginalFilename();

        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException(
                    "The uploaded file must have a filename"
            );
        }

        String lowerCaseFileName = fileName.toLowerCase(Locale.ROOT);

        if (!lowerCaseFileName.endsWith(".txt")
                && !lowerCaseFileName.endsWith(".md")) {
            throw new IllegalArgumentException(
                    "Only TXT and Markdown files are currently supported"
            );
        }
    }

    private String createTitleFromFileName(String fileName) {
        String nameWithoutExtension = fileName.replaceFirst(
                "\\.[^.]+$",
                ""
        );

        String normalizedName = nameWithoutExtension
                .replace("-", " ")
                .replace("_", " ")
                .trim();

        StringBuilder title = new StringBuilder();

        for (String word : normalizedName.split("\\s+")) {
            if (!word.isBlank()) {
                if (!title.isEmpty()) {
                    title.append(" ");
                }

                title.append(
                        Character.toUpperCase(word.charAt(0))
                );

                if (word.length() > 1) {
                    title.append(word.substring(1));
                }
            }
        }

        return title.toString();
    }

    private String createSlug(String title) {
        String slug = title
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");

        if (slug.isBlank()) {
            throw new IllegalArgumentException(
                    "Unable to generate a page slug from the title"
            );
        }

        return slug;
    }

    private String escapeYaml(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }

    public McpSchema.CallToolResult getPage(String slug) {
        return gbrainClient.callTool(
                new McpSchema.CallToolRequest(
                        "get_page",
                        Map.of(
                                "slug", slug,
                                "include_content", true
                        )
                )
        );
    }

    public McpSchema.CallToolResult deletePage(String slug) {
        return gbrainClient.callTool(
                new McpSchema.CallToolRequest(
                        "delete_page",
                        Map.of("slug", slug)
                )
        );
    }
}