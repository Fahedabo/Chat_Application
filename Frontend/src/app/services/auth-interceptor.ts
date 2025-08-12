import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from, switchMap, of } from 'rxjs';
import { AuthService } from './auth';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!req.url.includes('localhost:8080/api')) {
      return next.handle(req);
    }
    const currtUser = this.authService.getCurrentUser();

    if (currtUser) {
      //Firebase token
      return from(currtUser.getIdToken()).pipe(
        switchMap(token => {
          // add to header
          const authReq = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${token}`)
          });
          return next.handle(authReq);
        })
      );
    } else {
      return next.handle(req);
    }
  }
}
