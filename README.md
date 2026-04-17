# QuantaLab — Angular 17 Frontend

A complete Angular 17+ frontend for the Quantity Measurement microservices backend.

## Tech Stack

- **Angular 17** (standalone components, signals, functional guards/interceptors)
- **Reactive Forms** with full validation
- **Angular Signals** for reactive state
- **Canvas API** for built-in operation charts (no Chart.js dependency needed)
- **Custom CSS** — dark industrial aesthetic, no Angular Material

---

## Project Structure

```
src/app/
├── core/
│   ├── guards/
│   │   ├── auth.guard.ts         — protects /dashboard, /converter, /history
│   │   └── guest.guard.ts        — redirects logged-in users away from login/register
│   ├── interceptors/
│   │   └── auth.interceptor.ts   — attaches Bearer token, handles 401/403/0 errors
│   └── services/
│       ├── auth.service.ts       — login, register, logout, token management (signals)
│       ├── quantity.service.ts   — all quantity API calls
│       ├── history.service.ts    — user/all history API calls
│       └── toast.service.ts      — global toast notifications (signals)
│
├── features/
│   ├── auth/
│   │   ├── login/                — login page with branded split layout
│   │   └── register/             — register with password confirm validation
│   └── quantity/
│       ├── dashboard/            — stats, recent ops, quick actions
│       ├── converter/            — full converter: convert/add/subtract/compare/divide
│       └── history/              — searchable history table + canvas bar chart
│
└── shared/
    ├── components/
    │   ├── sidebar/              — collapsible sidebar with mobile support
    │   ├── spinner/              — reusable loading spinner
    │   └── toast/                — toast notification container
    └── models/
        ├── auth.models.ts        — LoginRequest, AuthResponse, etc.
        └── quantity.models.ts    — all unit enums, DTOs, response types
```

---

## Setup & Run

### Prerequisites
- Node.js 18+
- npm 9+
- Angular CLI 17: `npm install -g @angular/cli@17`
- Backend running at `http://localhost:8080`

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
ng serve

# 3. Open browser
# http://localhost:4200
```

### Environment config

Edit `src/environments/environment.ts` to change the API Gateway URL:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080'   // ← change this
};
```

---

## Pages & Routes

| Route        | Guard     | Description                              |
|--------------|-----------|------------------------------------------|
| `/login`     | guestGuard | Login page — redirects to dashboard if already logged in |
| `/register`  | guestGuard | Registration page                        |
| `/dashboard` | authGuard  | Stats, recent ops, quick actions         |
| `/converter` | authGuard  | Unit converter (all types + operations)  |
| `/history`   | authGuard  | Full searchable history with chart       |

---

## API Integration

All requests go through `http://localhost:8080` (API Gateway).

| Method | Endpoint                    | Auth | Used in       |
|--------|-----------------------------|------|---------------|
| POST   | /auth/login                 | No   | LoginComponent |
| POST   | /auth/register              | No   | RegisterComponent |
| POST   | /quantity/convert           | No   | ConverterComponent |
| POST   | /api/v1/quantities/add      | Yes  | ConverterComponent |
| POST   | /api/v1/quantities/subtract | Yes  | ConverterComponent |
| POST   | /api/v1/quantities/compare  | Yes  | ConverterComponent |
| POST   | /api/v1/quantities/convert  | Yes  | ConverterComponent |
| POST   | /api/v1/quantities/divide   | Yes  | ConverterComponent |
| GET    | /api/v1/history/user        | Yes  | Dashboard, History |
| GET    | /api/v1/history/all         | Yes  | HistoryComponent |

---

## JWT Flow

1. User logs in → `AuthService` saves token to `localStorage`
2. Every HTTP request → `authInterceptor` adds `Authorization: Bearer <token>`
3. 401 response → `authInterceptor` calls `AuthService.logout()` and redirects to `/login`
4. Token expiry checked on app boot via `AuthService.hasValidToken()`

---

## Customisation

### Change API URL
`src/environments/environment.ts` → `apiUrl`

### Add a new unit type
`src/app/shared/models/quantity.models.ts` → add to `UNIT_OPTIONS` and `UNIT_GROUPS`

### Add a new page
1. Create component in `src/app/features/`
2. Add route in `src/app/app.routes.ts`
3. Add nav item in `sidebar.component.ts`

---

## Production Build

```bash
ng build --configuration production
# Output: dist/quantity-frontend/
```

Deploy the `dist/quantity-frontend/browser/` folder to any static host (Nginx, Netlify, Vercel, S3).

For Nginx, add this to handle Angular routing:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```
