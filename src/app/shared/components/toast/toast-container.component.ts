import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.type }}" (click)="toastService.dismiss(toast.id)">
          <span class="toast-icon">{{ icons[toast.type] }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
      width: calc(100vw - 48px);
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 13px 16px;
      border-radius: 10px;
      font-family: var(--font-mono);
      font-size: 13px;
      cursor: pointer;
      border: 1px solid;
      animation: slideIn 0.25s cubic-bezier(0.4,0,0.2,1) forwards;
      backdrop-filter: blur(12px);
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(40px) scale(0.95); }
      to   { opacity: 1; transform: translateX(0) scale(1); }
    }

    .toast--success { background: rgba(34,197,94,0.12);  color: #22c55e; border-color: rgba(34,197,94,0.25); }
    .toast--error   { background: rgba(239,68,68,0.12);  color: #ef4444; border-color: rgba(239,68,68,0.25); }
    .toast--info    { background: rgba(59,130,246,0.12); color: #3b82f6; border-color: rgba(59,130,246,0.25);}
    .toast--warning { background: rgba(255,185,0,0.12);  color: #ffb900; border-color: rgba(255,185,0,0.25); }

    .toast-icon   { font-size: 16px; flex-shrink: 0; }
    .toast-message { flex: 1; line-height: 1.4; }
    .toast-close  { margin-left: auto; background: none; border: none; cursor: pointer; color: inherit; opacity: 0.6; font-size: 12px; padding: 0; flex-shrink: 0; }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  icons: Record<string, string> = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
    warning: '⚠',
  };
}
