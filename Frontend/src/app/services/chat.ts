import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Define ChatMessage
export interface ChatMessage {
  id?: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:8080/api/chat';

  constructor(private http: HttpClient) { }

  //chat history
  getChatHistory(user1: string, user2: string): Observable<ChatMessage[]> {
    const params = new HttpParams()
      .set('user1', user1)
      .set('user2', user2);

    return this.http.get<ChatMessage[]>(`${this.apiUrl}/history`, { params }).pipe(
      map(messages => this.sortMessagesAscending(messages))
    );
  }
  getRecentChatHistory(user1: string, user2: string): Observable<ChatMessage[]> {
    const params = new HttpParams()
      .set('user1', user1)
      .set('user2', user2);

    return this.http.get<ChatMessage[]>(`${this.apiUrl}/recent`, { params }).pipe(
      map(messages => this.sortMessagesAscending(messages))
    );
  }

  sendMessage(senderId: string, receiverId: string, message: string): Observable<ChatMessage> {
    const messageData = {
      senderId,
      receiverId,
      message,
      senderName: 'User' 
    };

    return this.http.post<ChatMessage>(`${this.apiUrl}/send`, messageData);
  }

  getMessagesBySender(userId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/sent/${userId}`).pipe(
      map(messages => this.sortMessagesAscending(messages))
    );
  }

  getMessagesByReceiver(userId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/received/${userId}`).pipe(
      map(messages => this.sortMessagesAscending(messages))
    );
  }

  getHealthStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  getSystemInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/info`);
  }

  
  //ensures messages display
  private sortMessagesAscending(messages: ChatMessage[]): ChatMessage[] {
    return messages.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB;
    });
  }
}
