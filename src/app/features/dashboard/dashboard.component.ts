import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TokenStoreService } from '../../core/services/token-store.service';
import { OPERATION_META, OperationType } from '../../shared/models/models';

@Component({
  selector: 'qm-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private auth    = inject(AuthService);
  private store   = inject(TokenStoreService);
  private router  = inject(Router);

  sidebarOpen    = false;
  userEmail      = '';
  userName       = '';
  userAvatar     = '';
  loginSource    = '';
  userInitial    = 'U';

  currentOp: OperationType = 'convert';
  opMeta = OPERATION_META;

  operations: OperationType[] = ['convert', 'add', 'subtract', 'compare', 'divide'];

  ngOnInit(): void {
    this.userEmail   = this.store.getEmail();
    this.userName    = this.store.getName() || this.userEmail;
    this.userAvatar  = this.store.getAvatar();
    this.loginSource = this.store.getSource();
    this.userInitial = this.userName.charAt(0).toUpperCase() || 'U';

    // Sync active sidebar item from the current URL
    const url = this.router.url;
    const seg = url.split('/').pop() as OperationType;
    if (seg && this.opMeta[seg]) this.currentOp = seg;
  }

  setOperation(op: OperationType): void {
    this.currentOp = op;
    this.router.navigate(['/dashboard', op]);
    if (this.sidebarOpen) this.toggleSidebar();
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }

  logout(): void { this.auth.logout(); }
}
