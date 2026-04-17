import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStoreService } from './token-store.service';
import { LoginRequest, RegisterRequest } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);
  private store  = inject(TokenStoreService);
  private base   = environment.apiBaseUrl;

  /**
   * POST /auth/login
   * Spring Boot may return:
   *   - A plain JWT string:        eyJhbGci...
   *   - A JSON object:             { "token": "eyJhbGci..." }
   * Both are handled here. On success the session is saved and
   * the caller receives the raw token string.
   */
  login(req: LoginRequest): Observable<string> {
    return this.http.post(`${this.base}/auth/login`, req, { responseType: 'text' }).pipe(
      map(raw => {
        // Try to parse as JSON first (handles { "token": "..." })
        try {
          const parsed = JSON.parse(raw);
          return (parsed.token ?? parsed.jwt ?? parsed.accessToken ?? raw) as string;
        } catch {
          // It really is a plain string JWT
          return raw.trim();
        }
      }),
      tap(token => {
        this.store.saveSession({
          token,
          email:  req.email,
          name:   '',
          avatar: '',
          source: 'password',
        });
      }),
      catchError(err => {
        // Normalise Spring Boot error bodies so the component gets a clean message
        const message =
          err?.error?.message ??
          err?.error?.error   ??
          err?.message        ??
          'Login failed. Check your credentials.';
        return throwError(() => new Error(message));
      })
    );
  }

  /** POST /auth/register → User object */
  register(req: RegisterRequest): Observable<unknown> {
    return this.http.post(`${this.base}/auth/register`, req).pipe(
      catchError(err => {
        const message =
          err?.error?.message ??
          err?.error?.error   ??
          err?.message        ??
          'Registration failed. Try a different email.';
        return throwError(() => new Error(message));
      })
    );
  }

  /** Handle Google OAuth callback params */
  handleOAuthCallback(params: Record<string, string>): boolean {
    const token  = params['token'];
    const email  = params['email']  ?? '';
    const name   = params['name']   ?? '';
    const avatar = params['avatar'] ?? '';
    const error  = params['error'];

    if (error) {
      this.router.navigate(['/login'], { queryParams: { oauthError: error } });
      return false;
    }

    if (token) {
      this.store.saveSession({ token, email, name, avatar, source: 'google' });

  
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 0);

      return true;
    }

    this.router.navigate(['/login'], { queryParams: { oauthError: 'missing_token' } });
    return false;
  }

  initiateGoogleLogin(): void {
    window.location.href = `${this.base}${environment.oauthEndpoint}`;
  }

  logout(): void {
    this.store.clearSession();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.store.isAuthenticated();
  }
}
