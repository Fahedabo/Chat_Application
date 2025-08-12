import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  title = 'Frontend';
  currentUser: User | null = null;
  isLoading = true;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {

    //starting 
    const currentPath = this.router.url;
    if (currentPath === '/' || currentPath === '') {
      this.router.navigate(['/login']);
    }
    this.authService.currentUser$.subscribe(user => {

      this.currentUser = user;
      this.isLoading = false;

      const currentPath = this.router.url;

      if (user) {
        if (currentPath === '/login') {
        }
      } else {
        if (currentPath === '/chat') {
          this.router.navigate(['/login']);
        }
      }
    });
  }
}
