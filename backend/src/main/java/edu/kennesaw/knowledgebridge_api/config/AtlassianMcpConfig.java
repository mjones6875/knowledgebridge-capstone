package edu.kennesaw.knowledgebridge_api.config;

import io.modelcontextprotocol.client.McpClient;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.client.transport.HttpClientStreamableHttpTransport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

import java.net.http.HttpRequest;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

@Configuration
public class AtlassianMcpConfig {

    @Bean(name = "atlassianMcpClient", destroyMethod = "close")
    @Lazy
    public McpSyncClient atlassianMcpClient(
            @Value("${atlassian.mcp.base-url}")
            String baseUrl,

            @Value("${atlassian.mcp.endpoint:/v2/mcp}")
            String endpoint,

            @Value("${ATLASSIAN_EMAIL:}")
            String email,

            @Value("${ATLASSIAN_API_TOKEN:}")
            String apiToken
    ) {
        if (email.isBlank() || apiToken.isBlank()) {
            throw new IllegalStateException(
                    "ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be configured"
            );
        }

        String credentials = email + ":" + apiToken;

        String encodedCredentials = Base64.getEncoder()
                .encodeToString(
                        credentials.getBytes(StandardCharsets.UTF_8)
                );

        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .header(
                        "Authorization",
                        "Basic " + encodedCredentials
                );

        HttpClientStreamableHttpTransport transport =
                HttpClientStreamableHttpTransport.builder(baseUrl)
                        .endpoint(endpoint)
                        .requestBuilder(requestBuilder)
                        .build();

        McpSyncClient client = McpClient.sync(transport)
                .requestTimeout(Duration.ofSeconds(120))
                .build();

        client.initialize();

        return client;
    }
}