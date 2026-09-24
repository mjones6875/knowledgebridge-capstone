package edu.kennesaw.knowledgebridge_api.client;

import edu.kennesaw.knowledgebridge_api.model.GbrainHealthResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class GbrainClient {

    private final RestClient restClient;

    public GbrainClient(
            RestClient.Builder restClientBuilder,
            @Value("${gbrain.base-url}") String gbrainBaseUrl) {

        this.restClient = restClientBuilder
                .baseUrl(gbrainBaseUrl)
                .build();
    }

    public GbrainHealthResponse getHealth() {
        return restClient.get()
                .uri("/health")
                .retrieve()
                .body(GbrainHealthResponse.class);
    }
}