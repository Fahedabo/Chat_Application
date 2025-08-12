package com.service;

import com.model.Concersation_Message;
import com.repository.Concersation_Message_Repo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final Concersation_Message_Repo msgRepo;

    public Concersation_Message saveMessage(Concersation_Message msgEntity) {
        try {
            Concersation_Message storedMsg = msgRepo.save(msgEntity);
            log.debug("Saved new message with ID: {}", storedMsg.getId());
            return storedMsg;
        } catch (Exception ex) {
            log.error("Unable to store message: {}", ex.getMessage());
            throw new RuntimeException("Message storage failed", ex);
        }
    }

    public List<Concersation_Message> getChatHistory(String u1, String u2) {
        try {
            List<Concersation_Message> convoData = msgRepo.findMessagesBetweenUsers(u1, u2);
            log.debug("Fetched {} total messages for users {} <-> {}", convoData.size(), u1, u2);
            return convoData;
        } catch (Exception ex) {
            log.error("Chat history fetch failed: {}", ex.getMessage());
            throw new RuntimeException("Unable to fetch chat history", ex);
        }
    }

    public List<Concersation_Message> getRecentChatHistory(String u1, String u2) {
        try {
            List<Concersation_Message> convoData = msgRepo.findRecentMessagesBetweenUsers(u1, u2);
            if (convoData.size() > 50) {
                convoData = convoData.subList(0, 50);
            }
            log.debug("Fetched {} recent messages for users {} <-> {}", convoData.size(), u1, u2);
            return convoData;
        } catch (Exception ex) {
            log.error("Recent chat retrieval failed: {}", ex.getMessage());
            throw new RuntimeException("Unable to get recent chat data", ex);
        }
    }

    public List<Concersation_Message> getMessagesBySender(String senderKey) {
        try {
            List<Concersation_Message> sentMsgs = msgRepo.findBySenderIdOrderByTimestampDesc(senderKey);
            log.debug("Retrieved {} messages sent by {}", sentMsgs.size(), senderKey);
            return sentMsgs;
        } catch (Exception ex) {
            log.error("Sender message fetch failed: {}", ex.getMessage());
            throw new RuntimeException("Unable to get messages by sender", ex);
        }
    }

    public List<Concersation_Message> getMessagesByReceiver(String receiverKey) {
        try {
            List<Concersation_Message> recvMsgs = msgRepo.findByReceiverIdOrderByTimestampDesc(receiverKey);
            log.debug("Retrieved {} messages received by {}", recvMsgs.size(), receiverKey);
            return recvMsgs;
        } catch (Exception ex) {
            log.error("Receiver message fetch failed: {}", ex.getMessage());
            throw new RuntimeException("Unable to get messages by receiver", ex);
        }
    }

    public Concersation_Message createMessage(String sId, String rId, String body) {
        try {
            Concersation_Message newMsg = new Concersation_Message(sId, rId, body);
            return saveMessage(newMsg);
        } catch (Exception ex) {
            log.error("Message creation failed: {}", ex.getMessage());
            throw new RuntimeException("Unable to create message", ex);
        }
    }
}
