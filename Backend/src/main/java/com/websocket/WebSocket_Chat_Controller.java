package com.websocket;

import com.model.Concersation_Message;
import com.service.FirebaseNotificationService;
import com.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocket_Chat_Controller {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final FirebaseNotificationService notificationService;

    @MessageMapping("/chat")
    public void handleChatMessage(@Payload Map<String, String> data, Principal principal) {
        try {
            String sender = data.get("senderId");
            String receiver = data.get("receiverId");
            String content = data.get("message");

            if (sender == null || receiver == null || content == null) {
                log.error("Invalid chat message data: missing required fields");
                return;
            }

            log.info("Chat message from {} to {}: {}", sender, receiver, content);

            Concersation_Message storedMessage = messageService.createMessage(sender, receiver, content);
            log.info("Message saved with ID: {}", storedMessage.getId());

            messagingTemplate.convertAndSendToUser(receiver, "/queue/messages", storedMessage);
            messagingTemplate.convertAndSendToUser(sender, "/queue/messages", storedMessage);

            String chatId = generateChatId(sender, receiver);
            messagingTemplate.convertAndSend("/topic/chat/" + chatId, storedMessage);
            messagingTemplate.convertAndSend("/topic/chat/" + sender, storedMessage);
            messagingTemplate.convertAndSend("/topic/chat/" + receiver, storedMessage);

            log.info("Message dispatched via WebSocket");

            try {
                String senderName = data.get("senderName");
                notificationService.sendPushNotification(receiver, sender, content, senderName);
                log.debug("Push notification sent");
            } catch (Exception e) {
                log.warn("Push notification failed: {}", e.getMessage());
            }

        } catch (Exception e) {
            log.error("Error processing chat message: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/typing")
    public void handleTypingIndicator(@Payload Map<String, String> data) {
        try {
            String sender = data.get("senderId");
            String receiver = data.get("receiverId");
            String typing = data.get("isTyping");

            if (sender == null || receiver == null) {
                log.warn("Invalid typing indicator data");
                return;
            }

            messagingTemplate.convertAndSendToUser(receiver, "/queue/typing", Map.of(
                    "senderId", sender,
                    "isTyping", typing != null ? typing : "false"
            ));

            log.debug("Typing indicator sent from {} to {}", sender, receiver);

        } catch (Exception e) {
            log.error("Error handling typing indicator: {}", e.getMessage());
        }
    }

    @MessageMapping("/status")
    @SendToUser("/queue/status")
    public Map<String, String> handleUserStatus(@Payload Map<String, String> data, Principal principal) {
        try {
            String user = data.get("userId");
            String status = data.get("status");

            if (principal != null && !user.equals(principal.getName())) {
                log.warn("Unauthorized status update attempt by {}", principal.getName());
                return Map.of("error", "Unauthorized");
            }

            log.info("User {} status changed to {}", user, status);

            messagingTemplate.convertAndSend("/topic/user-status", Map.of(
                    "userId", user,
                    "status", status,
                    "timestamp", String.valueOf(System.currentTimeMillis())
            ));

            return Map.of(
                    "userId", user,
                    "status", status,
                    "timestamp", String.valueOf(System.currentTimeMillis())
            );

        } catch (Exception e) {
            log.error("Error handling user status: {}", e.getMessage());
            return Map.of("error", "Failed to update status");
        }
    }

    @MessageMapping("/join")
    public void handleUserJoin(@Payload Map<String, String> data, Principal principal) {
        try {
            String user = data.get("userId");
            String action = data.get("action");

            if (principal != null && !user.equals(principal.getName())) {
                log.warn("Unauthorized join/leave attempt");
                return;
            }

            log.info("User {} {}", user, action);

            messagingTemplate.convertAndSend("/topic/user-status", Map.of(
                    "userId", user,
                    "action", action,
                    "timestamp", String.valueOf(System.currentTimeMillis())
            ));

        } catch (Exception e) {
            log.error("Error handling user join/leave: {}", e.getMessage());
        }
    }

    public void broadcastMessage(Concersation_Message msg) {
        try {
            log.info("Broadcasting message: {} -> {}", msg.getSenderId(), msg.getReceiverId());

            messagingTemplate.convertAndSendToUser(msg.getReceiverId(), "/queue/messages", msg);
            messagingTemplate.convertAndSendToUser(msg.getSenderId(), "/queue/messages", msg);

            String chatId = generateChatId(msg.getSenderId(), msg.getReceiverId());
            messagingTemplate.convertAndSend("/topic/chat/" + chatId, msg);
            messagingTemplate.convertAndSend("/topic/chat/" + msg.getSenderId(), msg);
            messagingTemplate.convertAndSend("/topic/chat/" + msg.getReceiverId(), msg);

            log.info("Message broadcast complete: {}", msg.getId());

        } catch (Exception e) {
            log.error("Error broadcasting message: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/test")
    public void handleTestMessage(@Payload Map<String, String> data, Principal principal) {
        try {
            String user = data.get("userId");
            String message = data.get("message");

            log.info("Test message from {}: {}", user, message);

            messagingTemplate.convertAndSendToUser(user, "/queue/test", Map.of(
                    "echo", "Test successful: " + message,
                    "timestamp", String.valueOf(System.currentTimeMillis()),
                    "principal", principal != null ? principal.getName() : "anonymous"
            ));

        } catch (Exception e) {
            log.error("Error handling test message: {}", e.getMessage());
        }
    }

    @MessageMapping("/connect")
    public void handleUserConnect(@Payload Map<String, String> data, Principal principal) {
        try {
            String user = data.get("userId");
            log.info("User connected: {}", user);

            messagingTemplate.convertAndSendToUser(user, "/queue/system", Map.of(
                    "type", "welcome",
                    "message", "Connection established",
                    "timestamp", String.valueOf(System.currentTimeMillis())
            ));

            messagingTemplate.convertAndSend("/topic/user-status", Map.of(
                    "userId", user,
                    "status", "online",
                    "action", "connect",
                    "timestamp", String.valueOf(System.currentTimeMillis())
            ));

        } catch (Exception e) {
            log.error("Error handling user connection: {}", e.getMessage());
        }
    }

    @MessageMapping("/disconnect")
    public void handleUserDisconnect(@Payload Map<String, String> data, Principal principal) {
        try {
            String user = data.get("userId");
            log.info("User disconnected: {}", user);

            messagingTemplate.convertAndSend("/topic/user-status", Map.of(
                    "userId", user,
                    "status", "offline",
                    "action", "disconnect",
                    "timestamp", String.valueOf(System.currentTimeMillis())
            ));

        } catch (Exception e) {
            log.error("Error handling user disconnect: {}", e.getMessage());
        }
    }

    private String generateChatId(String u1, String u2) {
        return u1.compareTo(u2) < 0 ? u1 + "_" + u2 : u2 + "_" + u1;
    }

    private boolean isValidMessageData(Map<String, String> data) {
        return data != null &&
                data.get("senderId") != null &&
                data.get("receiverId") != null &&
                data.get("message") != null &&
                !data.get("message").trim().isEmpty();
    }

    private String sanitizeMessage(String msg) {
        if (msg == null) return "";
        return msg.trim().substring(0, Math.min(msg.length(), 1000));
    }

    public Map<String, Object> getConnectionStats() {
        return Map.of(
                "service", "ChatWebSocketController",
                "status", "active",
                "timestamp", System.currentTimeMillis(),
                "endpoints", Map.of(
                        "chat", "/app/chat",
                        "typing", "/app/typing",
                        "status", "/app/status",
                        "join", "/app/join",
                        "test", "/app/test",
                        "connect", "/app/connect",
                        "disconnect", "/app/disconnect"
                )
        );
    }
}
