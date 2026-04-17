import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStoreService } from '../services/token-store.service';

export const authGuard: CanActivateFn = () => {
  const store = inject(TokenStoreService);
  const router = inject(Router);

  // ✅ IMPORTANT: return UrlTree instead of navigate()
  return store.isAuthenticated()
    ? true
    : router.createUrlTree(['/login']);
};


/** Redirects logged-in users away from auth pages */
export const guestGuard: CanActivateFn = () => {
  const store = inject(TokenStoreService);
  const router = inject(Router);

  return !store.isAuthenticated()
    ? true
    : router.createUrlTree(['/dashboard']);
};