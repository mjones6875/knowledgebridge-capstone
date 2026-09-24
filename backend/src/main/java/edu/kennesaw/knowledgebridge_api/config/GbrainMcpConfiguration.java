package edu.kennesaw.knowledgebridge_api.config;

import io.modelcontextprotocol.client.transport.customizer.McpSyncHttpClientRequestCustomizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GbrainMcpConfiguration {

    @Bean
    McpSyncHttpClientRequestCustomizer gbrainBearerTokenCustomizer(
            @Value("${gbrain.token}") String token) {

        return (requestBuilder, method, endpoint, body, context) ->
                requestBuilder.setHeader(
                        "Authorization",
                        "Bearer " + token
                );
    }
}