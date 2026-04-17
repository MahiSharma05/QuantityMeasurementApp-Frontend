import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (show) {
      <div class="spinner-wrap" [class.spinner-overlay]="overlay">
        <div class="spinner-ring" [style.width.px]="size" [style.height.px]="size"
             [style.border-width.px]="size > 28 ? 3 : 2"></div>
        @if (label) {
          <span class="spinner-label">{{ label }}</span>
        }
      </div>
    }
  `,
  styles: [`
    .spinner-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .spinner-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10,10,11,0.7);
      z-index: 9000;
      backdrop-filter: blur(4px);
    }

    .spinner-label {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-secondary);
      letter-spacing: 0.05em;
    }
  `]
})
export class SpinnerComponent {
  @Input() show = false;
  @Input() overlay = false;
  @Input() size = 24;
  @Input() label = '';
}
