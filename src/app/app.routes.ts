import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

// OAuth Success Component
import { OAuthSuccessComponent } from './features/auth/oauth-success/oauth-success.component';

export const routes: Routes = [

// ✅ Default route (IMPORTANT FIX)
{ path: '', redirectTo: '/login', pathMatch: 'full' },

// ================= AUTH ROUTES =================

// Login (only if NOT logged in)
{
path: 'login',
canActivate: [guestGuard],
loadComponent: () =>
import('./features/auth/login/login.component')
.then(m => m.LoginComponent),
},

// Register (only if NOT logged in)
{
path: 'register',
canActivate: [guestGuard],
loadComponent: () =>
import('./features/auth/register/register.component')
.then(m => m.RegisterComponent),
},

// ✅ OAuth callback route (VERY IMPORTANT)
{
path: 'oauth-success',
component: OAuthSuccessComponent
},

// ================= PROTECTED ROUTES =================

// Dashboard
{
path: 'dashboard',
canActivate: [authGuard],
loadComponent: () =>
import('./features/quantity/dashboard/dashboard.component')
.then(m => m.DashboardComponent),
},

// Converter
{
path: 'converter',
canActivate: [authGuard],
loadComponent: () =>
import('./features/quantity/converter/converter.component')
.then(m => m.ConverterComponent),
},

// History
{
path: 'history',
canActivate: [authGuard],
loadComponent: () =>
import('./features/quantity/history/history.component')
.then(m => m.HistoryComponent),
},

// ================= FALLBACK =================

// If route not found → go to login
{ path: '**', redirectTo: '/login' }
];
