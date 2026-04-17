import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';

/**
 * Functional HTTP interceptor (Angular 17+ style).
 *
 * 1. Attaches Bearer token to every outgoing request
 * 2. Handles 401 → logout + redirect
 * 3. Surfaces error messages via ToastService
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService  = inject(AuthService);
  const toastService = inject(ToastService);
  const router       = inject(Router);

  const token = authService.getToken();

  // Clone request and attach Authorization header if token exists
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {

      // 401 Unauthorized → session expired or invalid token
      if (error.status === 401) {
        authService.logout();
        router.navigate(['/login']);
        toastService.error('Session expired. Please log in again.');
        return throwError(() => error);
      }

      // 403 Forbidden
      if (error.status === 403) {
        toastService.error('You do not have permission to perform this action.');
        return throwError(() => error);
      }

      // 0 = network/CORS error
      if (error.status === 0) {
        toastService.error('Cannot reach the server. Check your connection.');
        return throwError(() => error);
      }

      // API error with message body
      const message =
        error.error?.message ||
        error.error?.error  ||
        error.message       ||
        'An unexpected error occurred.';

      toastService.error(message);
      return throwError(() => error);
    })
  );
};
