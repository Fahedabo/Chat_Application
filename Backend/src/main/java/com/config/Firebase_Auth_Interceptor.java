package com.config;

import com.google.firebase.auth.FirebaseToken;
import com.service.FirebaseTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.security.Principal;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class Firebase_Auth_Interceptor implements HandshakeInterceptor, ChannelInterceptor {

    private final FirebaseTokenService firebaseTokenService;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        log.debug("WS handshake from: {}", request.getRemoteAddress());

        String token = getTokenFromRequest(request);
        if (token != null && !token.isEmpty()) {
            try {
                FirebaseToken decoded = firebaseTokenService.verifyToken(token);
                attributes.put("firebaseToken", decoded);
                attributes.put("userId", decoded.getUid());
                log.info("WS handshake OK for user: {}", decoded.getUid());
                return true;
            } catch (Exception e) {
                log.error("Invalid WS token: {}", e.getMessage());
                return false;
            }
        }

        log.warn("No WS token, assigning anonymous ID");
        attributes.put("userId", "anonymous-" + System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && accessor.getCommand() != null) {
            switch (accessor.getCommand()) {
                case CONNECT:
                    log.debug("STOMP CONNECT received");
                    String userId = (String) accessor.getSessionAttributes().get("userId");

                    if (userId != null) {
                        accessor.setUser(new FirebasePrincipal(userId));
                        log.info("STOMP connected: {}", userId);
                    } else {
                        String token = accessor.getFirstNativeHeader("Authorization");
                        if (token != null && token.startsWith("Bearer ")) {
                            token = token.substring(7);
                            try {
                                FirebaseToken decoded = firebaseTokenService.verifyToken(token);
                                accessor.setUser(new FirebasePrincipal(decoded.getUid()));
                                log.info("STOMP authenticated via header: {}", decoded.getUid());
                            } catch (Exception e) {
                                log.error("Invalid STOMP token: {}", e.getMessage());
                                accessor.setUser(new FirebasePrincipal("anonymous-" + System.currentTimeMillis()));
                            }
                        } else {
                            log.warn("No STOMP Authorization header, assigning anonymous ID");
                            accessor.setUser(new FirebasePrincipal("anonymous-" + System.currentTimeMillis()));
                        }
                    }
                    break;

                case SEND:
                    Principal user = accessor.getUser();
                    if (user == null) {
                        log.warn("Unauthenticated user sending message");
                    }
                    break;
            }
        }
        return message;
    }

    private String getTokenFromRequest(ServerHttpRequest request) {
        URI uri = request.getURI();
        String query = uri.getQuery();

        if (query != null) {
            for (String pair : query.split("&")) {
                String[] keyValue = pair.split("=");
                if (keyValue.length == 2 && "token".equals(keyValue[0])) {
                    try {
                        return java.net.URLDecoder.decode(keyValue[1], "UTF-8");
                    } catch (Exception e) {
                        log.warn("Token decode failed: {}", e.getMessage());
                    }
                }
            }
        }

        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        String tokenHeader = request.getHeaders().getFirst("X-Firebase-Token");
        return (tokenHeader != null) ? tokenHeader : null;
    }

    private static class FirebasePrincipal implements Principal {
        private final String uid;
        public FirebasePrincipal(String uid) { this.uid = uid; }
        @Override
        public String getName() { return uid; }
    }
}
