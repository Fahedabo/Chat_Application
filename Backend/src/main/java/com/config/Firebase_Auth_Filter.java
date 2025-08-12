package com.config;

import com.google.firebase.auth.FirebaseToken;
import com.service.FirebaseTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@RequiredArgsConstructor
@Slf4j
public class Firebase_Auth_Filter extends OncePerRequestFilter {

    private final FirebaseTokenService firebaseTokenService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        try {
            String token = readToken(request);
            if (token != null) {
                try {
                    FirebaseToken decoded = firebaseTokenService.verifyToken(token);

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    decoded.getUid(),
                                    null,
                                    new ArrayList<>()
                            );
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(auth);
                    log.debug("User authenticated: {}", decoded.getUid());
                } catch (Exception e) {
                    log.warn("Token validation failed: {}", e.getMessage());
                    SecurityContextHolder.clearContext();
                }
            }
        } catch (Exception e) {
            log.error("Token processing error: {}", e.getMessage());
            SecurityContextHolder.clearContext();
        }
        chain.doFilter(request, response);
    }

    private String readToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        String paramToken = request.getParameter("token");
        return (paramToken != null && !paramToken.isEmpty()) ? paramToken : null;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.equals("/") ||
               path.equals("/favicon.ico") ||
               path.startsWith("/actuator/health") ||
               path.startsWith("/ws/") ||
               (path.startsWith("/api/users") && "POST".equals(request.getMethod())) ||
               (path.startsWith("/api/chat/health") && "GET".equals(request.getMethod())) ||
               (path.startsWith("/api/chat/info") && "GET".equals(request.getMethod()));
    }
}
