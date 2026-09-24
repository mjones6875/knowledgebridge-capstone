package edu.kennesaw.knowledgebridge_api.config;

import io.modelcontextprotocol.client.McpClient;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.client.transport.HttpClientStreamableHttpTransport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.http.HttpRequest;
import java.time.Duration;

@Configuration
public class GbrainMcpConfig {

    @Bean(destroyMethod = "close")
    public McpSyncClient gbrainMcpClient(
            @Value("${gbrain.base-url:http://localhost:8787}")
            String baseUrl,

            @Value("${GBRAIN_TOKEN}")
            String token
    ) {
        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .header("Authorization", "Bearer " + token);

        HttpClientStreamableHttpTransport transport =
                HttpClientStreamableHttpTransport.builder(baseUrl)
                        .endpoint("/mcp")
                        .requestBuilder(requestBuilder)
                        .build();

        McpSyncClient client = McpClient.sync(transport)
                .requestTimeout(Duration.ofSeconds(120))
                .build();

        client.initialize();

        return client;
    }
}