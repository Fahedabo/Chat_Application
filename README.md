
# WebSocket Chat App with Firebase Auth & MongoDB

Build real-time Chat Application using Angular Frontend, WebSockets, Spring Boot, Firebase Authentication, and MongoDB.

# Trilar-Demo to ChatApp
[https://drive.google.com/file/d/1h0FvwzBx1Aiwf20UYich3d3_pfB-ApPP/view?usp=share_link]
 

# Tech Stack

| Component       | Technology               |
|-----------------|--------------------------|
| **Frontend**    | Angular                  |
| **Backend**     | Spring Boot (Java)       |
| **Auth**        | Firebase Authentication  |
| **Database**    | MongoDB                  |
| **Realtime**    | WebSockets               |
| **Hosting**     | Firebase Hosting         |
| **Functions**   | Firebase Cloud Functions |


# Features

- Firebase Email/Google Authentication
- Real-time messaging via WebSockets
- Message history from MongoDB
- Protected WebSocket connections with JWT
- Firebase push notification simulation


# Real-Time Send/Receive Messaging Architecture using WebSocket Protocol

Message json model:
 {
  "senderId": "string",
  "receiverId": "string",
  "timestamp": "ISO date string",
  "message": "string"
}


# Backend System Design

- Spring Boot FrameWork 

- WebSocket (STOMP) for real-time messaging
and REST for historical data retrieval as **Communication Protocols**

- MongoDB for message storage  

- Verification for both WebSocket & REST endpoints using firebase JWT


# Frontend Design

- Built with **Angular** and hosted on Firebase for fast and reliable delivery  

- Displays past messages and instantly updates chats as new ones arrive 

- Handles secure user sign-in and tracks authentication status in real time  

- Lets users browse and select contacts for one-on-one conversations  
 
# starting the project 

***Backend Setup:***
1- update `application.properties` in `Backend/src/main/resources`
application.properties content: 

spring.application.name=ChatApp
server.port=8080

# MongoDB Configuration
spring.data.mongodb.uri=YOUR_MONGODB_ATLAS_URI
spring.data.mongodb.database=chatApp

# Firebase Configuration
firebase.project-id=YOUR_FIREBASE_PROJECT_ID
firebase.firebase-service-account-key=classpath:firebase-service-account-key.json

# CORS Configuration
cors.allowed-origins=http://localhost:4200

2- update `firebase-service-account-key.json` in `Backend/src/main/resources`
    using your firebase service config (see Firebase setup instructions)

3- update your Firebase function URL on `Backend/functions/server.js`

Run backend
```bash
mvn spring-boot:run
```

***Frontend Setup:***

```bash
cd Frontend
npm install
```
- Update your firebaseConfig file in `Frontend/src/environments/firebase.config.ts`,
according to your Configuration.

Run Frontend
```bash
ng serve
```

# see Firebase setup instructions
1. Open the [Firebase Console](https://console.firebase.google.com)  
2. Start a new Firebase project  
3. Turn on Authentication and enable **Email/Password** && **Google Sign-In** methods  
4. Generate a Service Account key and download it as `firebase-service-account-key.json`  
5. Configure Firebase Hosting for your frontend deployment  
6. Add a Firebase Cloud Function to handle notification logging  


# AI Usage
- DeepSeek -> Assisted in building most of the frontend structure and features  
- ChatGPT-> Provided explanations, code guidance, and helped craft the README  
- GitHub Copilot -> Completed missing code segments, fixed errors, and improved code readability  


