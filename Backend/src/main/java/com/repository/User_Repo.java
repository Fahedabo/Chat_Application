package com.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import com.model.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface User_Repo extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    List<User> findAllByUidNot(String excludeUid);

    @Query("{ 'name': { $regex: ?0, $options: 'i' } }")
    List<User> findByNameContainingIgnoreCase(String name);

    @Query("{ 'name': { $regex: ?0, $options: 'i' }, 'uid': { $ne: ?1 } }")
    List<User> findByNameContainingIgnoreCaseAndUidNot(String name, String excludeUid);

    boolean existsByUid(String uid);

    boolean existsByEmail(String email);

    List<User> findByProvider(String provider);

    long count();
}
