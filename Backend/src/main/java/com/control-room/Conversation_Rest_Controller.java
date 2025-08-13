package com.controller;

import com.model.Concersation_Message;
import com.service.FirebaseNotificationService;
import com.service.MessageService;
import com.websocket.WebSocket_Chat_Controller;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class Conversation_Rest_Controller {

    private final WebSocket_Chat_Controller webSocketController;
    private final MessageService messageService;
    private final FirebaseNotificationService firebaseNotificationService;

    @GetMapping("/history")
    public ResponseEntity<List<Concersation_Message>> getChatHistory(
            @RequestParam String user1,
            @RequestParam String user2) {
        try {
            log.debug("Fetching chat history between {} and {}", user1, user2);
            List<Concersation_Message> messages = messageService.getChatHistory(user1, user2);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error fetching chat history: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/recent")
    public ResponseEntity<List<Concersation_Message>> getRecentChatHistory(
            @RequestParam String user1,
            @RequestParam String user2) {
        try {
            log.debug("Fetching recent chat history between {} and {}", user1, user2);
            List<Concersation_Message> messages = messageService.getRecentChatHistory(user1, user2);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error fetching recent chat history: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/send")
    public ResponseEntity<Concersation_Message> sendMessage(@RequestBody Map<String, String> messageData) {
        try {
            String senderId = messageData.get("senderId");
            String receiverId = messageData.get("receiverId");
            String messageContent = messageData.get("message");

            if (senderId == null || receiverId == null || messageContent == null) {
                log.warn("Invalid message data: missing required fields");
                return ResponseEntity.badRequest().build();
            }

            log.debug("Sending message via REST from {} to {}: {}", senderId, receiverId, messageContent);

            Concersation_Message savedMessage = messageService.createMessage(senderId, receiverId, messageContent);
            log.debug("Message saved to MongoDB: {}", savedMessage.getId());

            try {
                webSocketController.broadcastMessage(savedMessage);
                log.debug("Message broadcasted via WebSocket");
            } catch (Exception e) {
                log.warn("Failed to broadcast via WebSocket: {}", e.getMessage());
            }

            try {
                String senderName = messageData.get("senderName");
                firebaseNotificationService.sendPushNotification(
                        receiverId,
                        senderId,
                        messageContent,
                        senderName
                );
                log.debug("Firebase push notification triggered successfully");
            } catch (Exception e) {
                log.warn("Failed to send push notification: {}", e.getMessage());
            }

            return ResponseEntity.ok(savedMessage);

        } catch (Exception e) {
            log.error("Error sending message via REST: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/sent/{userId}")
    public ResponseEntity<List<Concersation_Message>> getMessagesBySender(@PathVariable String userId) {
        try {
            log.debug("Fetching messages sent by user {}", userId);
            List<Concersation_Message> messages = messageService.getMessagesBySender(userId);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error fetching messages by sender: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/received/{userId}")
    public ResponseEntity<List<Concersation_Message>> getMessagesByReceiver(@PathVariable String userId) {
        try {
            log.debug("Fetching messages received by user {}", userId);
            List<Concersation_Message> messages = messageService.getMessagesByReceiver(userId);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error fetching messages by receiver: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "healthy",
                "service", "chat-api",
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, String>> getSystemInfo() {
        return ResponseEntity.ok(Map.of(
                "service", "ChatApp Project Backend",
                "version", "1.0.0",
                "status", "running",
                "database", "MongoDB",
                "websocket", "enabled",
                "firebase-functions", "enabled",
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }
}
