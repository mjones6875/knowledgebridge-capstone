package edu.kennesaw.knowledgebridge_api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "GBRAIN_TOKEN=test-token"
})
class KnowledgebridgeApiApplicationTests {

    @Test
    void contextLoads() {
    }
}
