package edu.kennesaw.knowledgebridge_api.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
public class GbrainUnavailableException
        extends RuntimeException {

    public GbrainUnavailableException(
            String message,
            Throwable cause
    ) {
        super(message, cause);
    }
}
