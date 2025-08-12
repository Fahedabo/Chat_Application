import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  provider: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) { }

  // Save user to database
  saveUser(user: AppUser): Observable<AppUser> {
    return this.http.post<AppUser>(this.apiUrl, user);
  }

  getAllUsers(excludeUserId?: string): Observable<AppUser[]> {
    let params = new HttpParams();
    if (excludeUserId) {
      params = params.set('excludeUserId', excludeUserId);
    }

    return this.http.get<AppUser[]>(this.apiUrl, { params });
  }

  getUserById(userId: string): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.apiUrl}/${userId}`);
  }

  getUserByEmail(email: string): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.apiUrl}/email/${email}`);
  }

  searchUsers(query: string, excludeUserId?: string): Observable<AppUser[]> {
    let params = new HttpParams().set('query', query);
    if (excludeUserId) {
      params = params.set('excludeUserId', excludeUserId);
    }

    return this.http.get<AppUser[]>(`${this.apiUrl}/search`, { params });
  }

  // Update user status (online/offline)
  updateUserStatus(userId: string, status: string): Observable<string> {
    const params = new HttpParams().set('status', status);
    return this.http.put<string>(`${this.apiUrl}/${userId}/status`, null, { params });
  }

  getUserCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count`);
  }

  getUserDisplayName(user: AppUser): string {
    if (user.name && user.name.trim()) {
      return user.name;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Unknown User';
  }

  getUserAvatar(user: AppUser): string {
    if (user.photoURL) {
      return user.photoURL;
    }
    // Return default avatar based on first letter of name
    const firstLetter = this.getUserDisplayName(user).charAt(0).toUpperCase();
    return `https://ui-avatars.com/api/?name=${firstLetter}&background=667eea&color=fff&size=40`;
  }
}
