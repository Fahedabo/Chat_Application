package com.model;

import lombok.Data;
import lombok.Generated;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "users")
public class User {

    @Id
    @Generated
    private String uid;

    private String email;
    private String name;
    private String photoURL;
    private String provider;
}
