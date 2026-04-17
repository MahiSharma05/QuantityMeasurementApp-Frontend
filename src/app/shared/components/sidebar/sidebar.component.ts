import { Component, inject, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <!-- Mobile overlay -->
    @if (mobileOpen()) {
      <div class="sidebar-overlay" (click)="closeMobile()"></div>
    }

    <!-- Sidebar -->
    <aside class="sidebar" [class.sidebar--open]="mobileOpen()">
      <!-- Brand -->
      <div class="sidebar-brand">
        <div class="brand-mark">Q</div>
        <div class="brand-text">
          <span class="brand-name">QuantaLab</span>
          <span class="brand-sub">Measurement Intelligence</span>
        </div>
      </div>

      <div class="sidebar-divider"></div>

      <!-- User pill -->
      <div class="user-pill">
        <div class="user-avatar">{{ userInitial() }}</div>
        <div class="user-info">
          <span class="user-email">{{ authService.currentEmail() }}</span>
          <span class="user-role">Operator</span>
        </div>
      </div>

      <div class="sidebar-divider"></div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <span class="nav-section-label">Workspace</span>

        @for (item of navItems; track item.path) {
          <a class="nav-item"
             [routerLink]="item.path"
             routerLinkActive="nav-item--active"
             (click)="closeMobile()">
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
            @if (item.badge) {
              <span class="nav-badge">{{ item.badge }}</span>
            }
          </a>
        }
      </nav>

      <div class="sidebar-spacer"></div>

      <!-- Logout -->
      <button class="logout-btn" (click)="logout()">
        <span>⎋</span>
        <span>Sign out</span>
      </button>
    </aside>
  `,
  styles: [`
    .sidebar-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 99;
      display: none;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      width: var(--sidebar-width);
      height: 100vh;
      background: var(--bg-surface);
      border-right: 1px solid var(--border);
      padding: 0;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 100;
      transition: transform 0.25s ease;
      overflow-y: auto;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px;
    }

    .brand-mark {
      width: 34px;
      height: 34px;
      background: var(--accent);
      color: #0a0a0b;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 18px;
      flex-shrink: 0;
    }

    .brand-name {
      display: block;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 15px;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .brand-sub {
      display: block;
      font-size: 10px;
      color: var(--text-muted);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .sidebar-divider { height: 1px; background: var(--border); margin: 4px 0; }

    .user-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      background: var(--accent-dim);
      border: 1px solid var(--border-accent);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 13px;
      color: var(--accent);
      flex-shrink: 0;
    }

    .user-email {
      display: block;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-primary);
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-role {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      padding: 8px 10px;
      gap: 2px;
    }

    .nav-section-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      padding: 8px 8px 6px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: 8px;
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 500;
      transition: var(--transition);
      cursor: pointer;
      border: 1px solid transparent;

      &:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }

      &.nav-item--active {
        background: var(--accent-dim);
        color: var(--accent);
        border-color: var(--border-accent);
      }
    }

    .nav-icon { font-size: 16px; width: 20px; text-align: center; }
    .nav-label { flex: 1; }

    .nav-badge {
      background: var(--accent);
      color: #0a0a0b;
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 100px;
    }

    .sidebar-spacer { flex: 1; }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: calc(100% - 20px);
      margin: 10px;
      padding: 10px 12px;
      background: none;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-muted);
      font-family: var(--font-display);
      font-size: 13px;
      cursor: pointer;
      transition: var(--transition);

      &:hover {
        background: var(--danger-dim);
        color: var(--danger);
        border-color: rgba(239,68,68,0.2);
      }
    }

    /* Mobile */
    @media (max-width: 768px) {
      .sidebar-overlay { display: block; }
      .sidebar { transform: translateX(-100%); }
      .sidebar--open { transform: translateX(0); }
    }
  `]
})
export class SidebarComponent {
  authService  = inject(AuthService);
  toastService = inject(ToastService);

  mobileOpen = signal(false);

  navItems: NavItem[] = [
    { path: '/dashboard',  label: 'Dashboard',  icon: '◈' },
    { path: '/converter',  label: 'Converter',  icon: '⇌' },
    { path: '/history',    label: 'History',    icon: '≡' },
  ];

  userInitial(): string {
    const email = this.authService.currentEmail();
    return email ? email[0].toUpperCase() : 'U';
  }

  logout(): void {
    this.authService.logout();
    this.toastService.info('Signed out successfully.');
  }

  openMobile()  { this.mobileOpen.set(true); }
  closeMobile() { this.mobileOpen.set(false); }
}
