import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  signUpForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showSignUp = false;
  currentUser: User | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.signUpForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Check if user logged in
    this.authService.currentUser$.subscribe((user: User | null) => {
      this.currentUser = user;
      if (user) {
        console.log('User logged in', user.email);
      }
    });
  }

  // Continue with current account
  continueWithCurrentAccount(): void {
    if (this.currentUser) {
      this.router.navigate(['/chat']);
    }
  }

  async switchAccount(): Promise<void> {
    try {
      await this.authService.signOut();
      this.currentUser = null;
      this.errorMessage = '';
    } catch (error: any) {
      console.error('Error switching account:', error);
      this.errorMessage = 'Error switching account: ' + error.message;
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  async signIn(): Promise<void> {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { email, password } = this.loginForm.value;
      await this.authService.signIn(email, password);
      this.router.navigate(['/chat']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error);
      console.error('Sign in error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async signUp(): Promise<void> {
    if (this.signUpForm.invalid) {
      this.markFormGroupTouched(this.signUpForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { name, email, password } = this.signUpForm.value;
      await this.authService.signUp(email, password, name);
      this.router.navigate(['/chat']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error);
      console.error('Sign up error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async googleSignIn(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.signInWithGoogle();
      this.router.navigate(['/chat']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error);
      console.error('error in Google sign in:', error);
    } finally {
      this.isLoading = false;
    }
  }

  toggleSignUp(): void {
    this.showSignUp = !this.showSignUp;
    this.errorMessage = '';
    this.loginForm.reset();
    this.signUpForm.reset();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/popup-closed-by-user':
        return 'Sign in was cancelled.';
      case 'auth/popup-blocked':
        return 'Pop-up blocked. Please allow pop-ups for this site.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      default:
        return error.message || 'An error occurred during authentication.';
    }
  }

  get currentForm(): FormGroup {
    return this.showSignUp ? this.signUpForm : this.loginForm;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.currentForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.currentForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['passwordMismatch']) return 'Passwords do not match';
    }
    return '';
  }
}
