package edu.kennesaw.knowledgebridge_api.controller;

import edu.kennesaw.knowledgebridge_api.dto.IngestResponse;
import edu.kennesaw.knowledgebridge_api.dto.SearchResponse;
import edu.kennesaw.knowledgebridge_api.dto.TextIngestionRequest;
import edu.kennesaw.knowledgebridge_api.service.GbrainMcpService;
import io.modelcontextprotocol.spec.McpSchema;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import edu.kennesaw.knowledgebridge_api.dto.AnswerResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/gbrain")
public class GbrainController {

    private final GbrainMcpService gbrainMcpService;

    public GbrainController(GbrainMcpService gbrainMcpService) {
        this.gbrainMcpService = gbrainMcpService;
    }

//    @GetMapping("/tools/{toolName}")
//    public Object getToolDefinition(
//            @PathVariable String toolName
//    ) {
//        return gbrainMcpService.getToolDefinition(toolName);
//    }

    @PostMapping("/ingest/text")
    public McpSchema.CallToolResult ingestText(
            @RequestBody TextIngestionRequest request
    ) {
        return gbrainMcpService.ingestText(request);
    }

    @GetMapping("/tools")
    public List<McpSchema.Tool> listTools() {
        return gbrainMcpService.listTools();
    }

    @GetMapping("/pages")
    public McpSchema.CallToolResult listPages() {
        return gbrainMcpService.listPages();
    }

    @GetMapping("/query-raw")
    public McpSchema.CallToolResult queryRaw(@RequestParam String query) {
        return gbrainMcpService.queryRaw(query);
    }

    @GetMapping("/search")
    public SearchResponse search(@RequestParam String query) {
        return gbrainMcpService.search(query);
    }

    @GetMapping("/answer")
    public AnswerResponse answer(@RequestParam String question) {
        return gbrainMcpService.answer(question);
    }

    @GetMapping("/answer-raw")
    public McpSchema.CallToolResult answerRaw(@RequestParam String question) {
        return gbrainMcpService.answerRaw(question);
    }

    @PostMapping(
            value = "/ingest/file",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public IngestResponse ingestFile(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String title
    ) {
        return gbrainMcpService.ingestFile(file, title);
    }

    @GetMapping("/pages/{slug}")
    public McpSchema.CallToolResult getPage(@PathVariable String slug) {
        return gbrainMcpService.getPage(slug);
    }

    @DeleteMapping("/pages/{slug}")
    public McpSchema.CallToolResult deletePage(@PathVariable String slug) {
        return gbrainMcpService.deletePage(slug);
    }
}