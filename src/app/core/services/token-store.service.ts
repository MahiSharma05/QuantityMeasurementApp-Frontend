import { Injectable } from '@angular/core';
import { UserSession } from '../../shared/models/models';

const KEYS = {
  TOKEN:  'qm_jwt_token',
  EMAIL:  'qm_user_email',
  NAME:   'qm_user_name',
  AVATAR: 'qm_user_avatar',
  SOURCE: 'qm_login_source',
} as const;

@Injectable({ providedIn: 'root' })
export class TokenStoreService {

  getToken(): string | null        { return localStorage.getItem(KEYS.TOKEN);  }
  getEmail(): string               { return localStorage.getItem(KEYS.EMAIL)  ?? ''; }
  getName(): string                { return localStorage.getItem(KEYS.NAME)   ?? ''; }
  getAvatar(): string              { return localStorage.getItem(KEYS.AVATAR) ?? ''; }
  getSource(): 'password'|'google' { return (localStorage.getItem(KEYS.SOURCE) as 'password'|'google') ?? 'password'; }

  isAuthenticated(): boolean { return !!this.getToken(); }

  saveSession(session: UserSession): void {
    localStorage.setItem(KEYS.TOKEN,  session.token);
    localStorage.setItem(KEYS.EMAIL,  session.email);
    localStorage.setItem(KEYS.NAME,   session.name);
    localStorage.setItem(KEYS.AVATAR, session.avatar);
    localStorage.setItem(KEYS.SOURCE, session.source);
  }

  clearSession(): void {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }
}
