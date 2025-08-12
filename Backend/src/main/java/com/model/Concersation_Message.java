package com.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "messages")
@TypeAlias("Message")
public class Concersation_Message {

    @Id
    private String id;

    private String senderId;

    private String receiverId;

    private String message;

    private LocalDateTime timestamp;

    public Concersation_Message(String senderId, String receiverId, String message) {
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }
}