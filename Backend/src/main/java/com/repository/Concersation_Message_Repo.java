package com.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import com.model.Concersation_Message;

import java.util.List;

@Repository
public interface Concersation_Message_Repo extends MongoRepository<Concersation_Message, String> {

    @Query("{ $or: [ { $and: [ { 'senderId': ?0 }, { 'receiverId': ?1 } ] }, { $and: [ { 'senderId': ?1 }, { 'receiverId': ?0 } ] } ] }")
    List<Concersation_Message> findMessagesBetweenUsers(String userId1, String userId2);
 
    List<Concersation_Message> findBySenderIdOrderByTimestampDesc(String senderId);

    List<Concersation_Message> findByReceiverIdOrderByTimestampDesc(String receiverId);

     
    @Query(value = "{ $or: [ { $and: [ { 'senderId': ?0 }, { 'receiverId': ?1 } ] }, { $and: [ { 'senderId': ?1 }, { 'receiverId': ?0 } ] } ] }",
           sort = "{ 'timestamp': -1 }")
    List<Concersation_Message> findRecentMessagesBetweenUsers(String userId1, String userId2);
}
