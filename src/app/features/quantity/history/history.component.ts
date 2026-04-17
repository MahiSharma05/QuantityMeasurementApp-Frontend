import { Component, inject, OnInit, signal, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { HistoryService } from '../../../core/services/history.service';
import { AuthService } from '../../../core/services/auth.service';
import { OperationHistoryItem } from '../../../shared/models/quantity.models';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, SpinnerComponent],
  templateUrl: './history.component.html',
  styleUrls: ['../dashboard/dashboard.component.scss', './history.component.scss']
})
export class HistoryComponent implements OnInit, AfterViewInit {
  @ViewChild('chartCanvas') chartCanvasRef!: ElementRef<HTMLCanvasElement>;

  private historyService = inject(HistoryService);
  authService            = inject(AuthService);

  loading      = signal(true);
  allItems     = signal<OperationHistoryItem[]>([]);
  filtered     = signal<OperationHistoryItem[]>([]);

  searchQuery  = '';
  filterType   = 'ALL';
  viewMode     = signal<'user' | 'all'>('user');

  private chart: any = null;

  readonly opTypes = ['ALL', 'ADD', 'SUBTRACT', 'COMPARE', 'CONVERT', 'CONVERT_UNITS', 'DIVIDE'];

  ngOnInit(): void {
    this.loadUserHistory();
  }

  ngAfterViewInit(): void {
    // Chart initialised after data loads
  }

  loadUserHistory(): void {
    this.loading.set(true);
    this.viewMode.set('user');
    this.historyService.getUserHistory().subscribe({
      next: (data) => {
        this.allItems.set(data);
        this.applyFilter();
        this.loading.set(false);
        setTimeout(() => this.renderChart(), 100);
      },
      error: () => this.loading.set(false)
    });
  }

  loadAllHistory(): void {
    this.loading.set(true);
    this.viewMode.set('all');
    this.historyService.getAllHistory().subscribe({
      next: (data) => {
        this.allItems.set(data);
        this.applyFilter();
        this.loading.set(false);
        setTimeout(() => this.renderChart(), 100);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilter(): void {
    let items = this.allItems();
    if (this.filterType !== 'ALL') {
      items = items.filter(i => i.operationType === this.filterType);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(i =>
        i.inputData.toLowerCase().includes(q) ||
        i.result.toLowerCase().includes(q) ||
        i.operationType.toLowerCase().includes(q) ||
        i.username?.toLowerCase().includes(q)
      );
    }
    this.filtered.set(items);
  }

  onSearch(): void { this.applyFilter(); }
  onFilterChange(): void { this.applyFilter(); }

  getOpColor(op: string): string {
    const map: Record<string, string> = {
      ADD: 'success', SUBTRACT: 'info', COMPARE: 'accent',
      CONVERT: 'accent', CONVERT_UNITS: 'accent', DIVIDE: 'warning',
    };
    return map[op] ?? 'muted';
  }

  formatDateTime(ts: string): string {
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private renderChart(): void {
    const canvas = this.chartCanvasRef?.nativeElement;
    if (!canvas) return;

    // Count by operation type
    const counts: Record<string, number> = {};
    this.allItems().forEach(h => {
      counts[h.operationType] = (counts[h.operationType] ?? 0) + 1;
    });

    const labels = Object.keys(counts);
    const data   = Object.values(counts);

    if (labels.length === 0) return;

    // Inline Chart.js via dynamic import-style manual creation
    // (no npm available, using canvas 2D directly)
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    this.drawBarChart(ctx, canvas, labels, data);
  }

  private drawBarChart(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    labels: string[],
    data: number[]
  ): void {
    const W = canvas.width  = canvas.offsetWidth  * devicePixelRatio;
    const H = canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    const pad   = { top: 20, right: 20, bottom: 50, left: 40 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top  - pad.bottom;
    const max    = Math.max(...data);
    const barW   = (chartW / labels.length) * 0.6;
    const gap    = (chartW / labels.length) * 0.4;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    const gridCount = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;
    for (let i = 0; i <= gridCount; i++) {
      const y = pad.top + chartH - (i / gridCount) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();

      // Y labels
      ctx.fillStyle = 'rgba(138,135,144,0.7)';
      ctx.font = `${10 * (w < 400 ? 0.8 : 1)}px "DM Mono", monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(Math.round((i / gridCount) * max).toString(), pad.left - 6, y + 4);
    }

    // Bars
    const colors = ['#ffb900','#22c55e','#3b82f6','#ef4444','#a855f7','#f97316'];
    labels.forEach((label, i) => {
      const barH  = (data[i] / max) * chartH || 0;
      const x     = pad.left + i * (barW + gap) + gap / 2;
      const y     = pad.top + chartH - barH;
      const color = colors[i % colors.length];

      // Bar fill
      const grad = ctx.createLinearGradient(x, y, x, pad.top + chartH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '33');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Value on top of bar
      ctx.fillStyle = color;
      ctx.font = `bold ${11 * (w < 400 ? 0.8 : 1)}px "DM Mono", monospace`;
      ctx.textAlign = 'center';
      if (barH > 16) ctx.fillText(data[i].toString(), x + barW / 2, y - 6);

      // X label
      ctx.fillStyle = 'rgba(138,135,144,0.8)';
      ctx.font = `${9 * (w < 400 ? 0.8 : 1)}px "DM Mono", monospace`;
      ctx.textAlign = 'center';
      const shortLabel = label.length > 8 ? label.slice(0, 7) + '.' : label;
      ctx.fillText(shortLabel, x + barW / 2, pad.top + chartH + 18);
    });

    this.chart = true;
  }
}
