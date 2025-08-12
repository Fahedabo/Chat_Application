package com.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class FirebaseNotificationService {

    @Value("${firebase.functions.base-url:http://127.0.0.1:5001/chatapp-3a46e/us-central1}")
    private String firebaseFunctionsBaseUrl;

    private final RestTemplate restTemplate;

    public FirebaseNotificationService() {
        this.restTemplate = new RestTemplate();
    }

    public void sendPushNotification(String receiverId, String senderId, String message, String senderName) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("receiverId", receiverId);
            payload.put("senderId", senderId);
            payload.put("message", message);
            payload.put("senderName", senderName != null ? senderName : senderId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

            String functionUrl = firebaseFunctionsBaseUrl + "/sendNotificationHTTP";

            log.debug("Calling Firebase Function: {} with payload: {}", functionUrl, payload);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    functionUrl,
                    requestEntity,
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Push notification sent successfully to user: {}", receiverId);
                log.debug("Firebase Function response: {}", response.getBody());
            } else {
                log.warn("Firebase Function returned non-success status: {}", response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("Failed to send push notification via Firebase Function: {}", e.getMessage(), e);
        }
    }

    public boolean testConnection() {
        try {
            String healthUrl = firebaseFunctionsBaseUrl + "/healthCheck";
            ResponseEntity<Map> response = restTemplate.getForEntity(healthUrl, Map.class);

            boolean isHealthy = response.getStatusCode().is2xxSuccessful();
            log.info("Firebase Functions health check: {}", isHealthy ? "HEALTHY" : "UNHEALTHY");

            return isHealthy;
        } catch (Exception e) {
            log.error("Firebase Functions health check failed: {}", e.getMessage());
            return false;
        }
    }
}
