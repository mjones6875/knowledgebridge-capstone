package edu.kennesaw.knowledgebridge_api.service;

import edu.kennesaw.knowledgebridge_api.dto.TranscriptionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class TranscriptionClient {

    private final RestClient restClient;

    public TranscriptionClient(
            @Value("${transcription.base-url:http://localhost:8090}")
            String transcriptionBaseUrl
    ) {
        SimpleClientHttpRequestFactory requestFactory =
                new SimpleClientHttpRequestFactory();

        requestFactory.setConnectTimeout(10_000);
        requestFactory.setReadTimeout(300_000);

        this.restClient = RestClient.builder()
                .baseUrl(transcriptionBaseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public TranscriptionResponse transcribe(MultipartFile file) {
        String fileName = file.getOriginalFilename() != null
                ? file.getOriginalFilename()
                : "uploaded-media";

        try {
            ByteArrayResource resource =
                    new ByteArrayResource(file.getBytes()) {
                        @Override
                        public String getFilename() {
                            return fileName;
                        }
                    };

            HttpHeaders fileHeaders = new HttpHeaders();

            fileHeaders.setContentDispositionFormData(
                    "file",
                    fileName
            );

            fileHeaders.setContentType(resolveMediaType(file));

            HttpEntity<ByteArrayResource> filePart =
                    new HttpEntity<>(resource, fileHeaders);

            MultiValueMap<String, Object> requestBody =
                    new LinkedMultiValueMap<>();

            requestBody.add("file", filePart);

            TranscriptionResponse response = restClient.post()
                    .uri("/transcribe")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(requestBody)
                    .retrieve()
                    .body(TranscriptionResponse.class);

            if (response == null) {
                throw new IllegalStateException(
                        "Transcription service returned an empty response"
                );
            }

            return response;

        } catch (RestClientResponseException exception) {
            throw new IllegalStateException(
                    "Transcription service returned HTTP "
                            + exception.getStatusCode()
                            + ": "
                            + exception.getResponseBodyAsString(),
                    exception
            );

        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to call transcription service: "
                            + exception.getMessage(),
                    exception
            );
        }
    }

    private MediaType resolveMediaType(MultipartFile file) {
        String contentType = file.getContentType();

        if (contentType == null || contentType.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }

        try {
            return MediaType.parseMediaType(contentType);
        } catch (Exception exception) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}