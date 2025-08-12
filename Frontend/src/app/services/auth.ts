import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
  onAuthStateChanged,
  updateProfile
} from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private http = inject(HttpClient);

  private googleProvider = new GoogleAuthProvider();
  currentUser$: Observable<User | null>;

  constructor() {
    this.currentUser$ = new Observable<User | null>((subscriber) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user: User | null) => {
        subscriber.next(user);
      });
      return () => unsubscribe();
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string, displayName?: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      if (displayName && displayName.trim()) {
        await updateProfile(user, {
          displayName: displayName.trim()
        });
      }

      await this.saveUserToBackend(user, 'email');

    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }
  // using spring boot to reach google
  async signInWithGoogle(): Promise<void> {
    try {
      const credential = await signInWithPopup(this.auth, this.googleProvider);
      const user = credential.user;

      await this.saveUserToBackend(user, 'google');

    } catch (error) {
      console.error('error siging in with google:', error);
      throw error;
    }
  }

  private async saveUserToBackend(user: User, provider: string): Promise<void> {
    try {
      await this.http.post('http://localhost:8080/api/users', {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        provider: provider
      }).toPromise();

    } catch (error) {
      console.error('Error on saving user:', error);
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
  //check auth
  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }
}
