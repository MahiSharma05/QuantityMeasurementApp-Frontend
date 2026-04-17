import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../../shared/models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {

private readonly TOKEN_KEY = 'qlab_token';
private readonly EMAIL_KEY = 'qlab_email';

// Reactive state via Angular signals
private _isLoggedIn = signal<boolean>(this.hasValidToken());
private _currentEmail = signal<string>(this.getStoredEmail());

readonly isLoggedIn = computed(() => this._isLoggedIn());
readonly currentEmail = computed(() => this._currentEmail());

constructor(private http: HttpClient, private router: Router) {}

// ================= AUTH API =================

login(request: LoginRequest): Observable<AuthResponse> {
return this.http
.post<AuthResponse>(`${environment.apiUrl}/auth/login`, request)
.pipe(
tap(res => this.storeSession(res))
);
}

register(request: RegisterRequest): Observable<AuthResponse> {
return this.http
.post<AuthResponse>(`${environment.apiUrl}/auth/register`, request)
.pipe(
tap(res => this.storeSession(res))
);
}

logout(): void {
localStorage.removeItem(this.TOKEN_KEY);
localStorage.removeItem(this.EMAIL_KEY);


this._isLoggedIn.set(false);
this._currentEmail.set('');

this.router.navigate(['/login']);


}

// ================= TOKEN METHODS =================

getToken(): string | null {
return localStorage.getItem(this.TOKEN_KEY);
}

// ✅ EXISTING (used for normal login/register)
private storeSession(res: AuthResponse): void {
localStorage.setItem(this.TOKEN_KEY, res.token);
localStorage.setItem(this.EMAIL_KEY, res.email);


this._isLoggedIn.set(true);
this._currentEmail.set(res.email);


}

// ✅ NEW (used for Google OAuth login)
setOAuthSession(token: string): void {
// Store token
localStorage.setItem(this.TOKEN_KEY, token);


try {
  // Decode token payload
  const payload = JSON.parse(atob(token.split('.')[1]));
  const email = payload.sub || '';

  // Store email
  localStorage.setItem(this.EMAIL_KEY, email);

  // Update reactive state
  this._isLoggedIn.set(true);
  this._currentEmail.set(email);

} catch (e) {
  console.error('Invalid token format', e);
  this.logout();
}


}

// ================= HELPERS =================

private hasValidToken(): boolean {
const token = localStorage.getItem(this.TOKEN_KEY);
if (!token) return false;


try {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.exp * 1000 > Date.now();
} catch {
  return false;
}


}

private getStoredEmail(): string {
return localStorage.getItem(this.EMAIL_KEY) ?? '';
}
}
