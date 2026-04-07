import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStoreService } from '../services/token-store.service';

/** Attaches the Bearer JWT to every outgoing API request. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(TokenStoreService);
  const token = store.getToken();

  if (token && req.url.includes('/api/')) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    return next(cloned);
  }

  return next(req);
};
