package edu.kennesaw.knowledgebridge_api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI knowledgeBridgeOpenApi() {
        return new OpenAPI()
                .info(
                        new Info()
                                .title("KnowledgeBridge API")
                                .description(
                                        "REST API for knowledge ingestion, "
                                                + "hybrid search, grounded Q&A, "
                                                + "source management, and cost tracking."
                                )
                                .version("1.0.0")
                                .contact(
                                        new Contact()
                                                .name("KnowledgeBridge Team")
                                )
                );
    }
}
