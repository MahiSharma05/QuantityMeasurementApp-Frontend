import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./features/auth/signup/signup.component').then(m => m.SignupComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'oauth2/callback',
    loadComponent: () =>
      import('./features/auth/oauth-callback/oauth-callback.component').then(m => m.OauthCallbackComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'convert',
      },
      {
        path: 'convert',
        loadComponent: () =>
          import('./features/quantity/converter/converter.component').then(m => m.ConverterComponent),
      },
      {
        path: 'add',
        loadComponent: () =>
          import('./features/quantity/converter/converter.component').then(m => m.ConverterComponent),
      },
      {
        path: 'subtract',
        loadComponent: () =>
          import('./features/quantity/converter/converter.component').then(m => m.ConverterComponent),
      },
      {
        path: 'compare',
        loadComponent: () =>
          import('./features/quantity/converter/converter.component').then(m => m.ConverterComponent),
      },
      {
        path: 'divide',
        loadComponent: () =>
          import('./features/quantity/converter/converter.component').then(m => m.ConverterComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
