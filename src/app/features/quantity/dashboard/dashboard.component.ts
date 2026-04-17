import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router'; // ✅ ADDED
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { HistoryService } from '../../../core/services/history.service';
import { AuthService } from '../../../core/services/auth.service';
import { OperationHistoryItem } from '../../../shared/models/quantity.models';

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  sub?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent, SpinnerComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  private historyService = inject(HistoryService);
  authService            = inject(AuthService);

  private route = inject(ActivatedRoute); // ✅ ADDED

  loading  = signal(true);
  history  = signal<OperationHistoryItem[]>([]);
  recent   = signal<OperationHistoryItem[]>([]);

  stats = signal<StatCard[]>([]);

  operationTypes = ['ADD','SUBTRACT','COMPARE','CONVERT','DIVIDE','CONVERT_UNITS'];

  readonly quickActions = [
    { label: 'Convert units',  path: '/converter', icon: '⇌', desc: 'Temperature, length, weight, volume' },
    { label: 'View history',   path: '/history',   icon: '≡', desc: 'All past operations with results' },
  ];

  ngOnInit(): void {

    // ✅ NEW: HANDLE TOKEN FROM URL
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      localStorage.setItem('token', token);
    }

    // EXISTING CODE (UNCHANGED)
    this.historyService.getUserHistory().subscribe({
      next: (data) => {
        this.history.set(data);
        this.recent.set(data.slice(0, 5));
        this.buildStats(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  private buildStats(data: OperationHistoryItem[]): void {
    const total    = data.length;
    const typeSet  = new Set(data.map(d => d.operationType));
    const today    = data.filter(d =>
      new Date(d.timestamp).toDateString() === new Date().toDateString()
    ).length;
    const lastOp   = data[0]?.operationType ?? '—';

    this.stats.set([
      { label: 'Total operations', value: total,          icon: '∑', sub: 'All time' },
      { label: "Today's ops",      value: today,          icon: '◷', sub: new Date().toLocaleDateString() },
      { label: 'Operation types',  value: typeSet.size,   icon: '◈', sub: 'Unique types used' },
      { label: 'Last operation',   value: lastOp,         icon: '↻', sub: data[0] ? this.formatTime(data[0].timestamp) : '' },
    ]);
  }

  getOpColor(op: string): string {
    const map: Record<string, string> = {
      ADD:           'success',
      SUBTRACT:      'info',
      COMPARE:       'accent',
      CONVERT:       'accent',
      CONVERT_UNITS: 'accent',
      DIVIDE:        'warning',
    };
    return map[op] ?? 'muted';
  }

  formatTime(ts: string): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(ts: string): string {
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  opCounts(): { type: string; count: number }[] {
    const counts: Record<string, number> = {};
    this.history().forEach(h => {
      counts[h.operationType] = (counts[h.operationType] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }
}