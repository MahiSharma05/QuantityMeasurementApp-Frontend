import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Handles the redirect from Spring Boot's OAuth2SuccessHandler.
 * Spring Boot redirects to: /oauth2/callback?token=JWT&email=…&name=…&avatar=…
 * This component reads those params and hands off to AuthService.
 */
@Component({
  selector: 'qm-oauth-callback',
  standalone: true,
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;
                font-family:var(--font-mono);color:var(--text-muted);font-size:0.875rem;">
      Completing sign-in…
    </div>
  `,
})
export class OauthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth  = inject(AuthService);

  ngOnInit(): void {
    // Read from query string AND hash fragment (Spring Boot can deliver either way)
    const qp = this.route.snapshot.queryParams;
    const hp  = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const params: Record<string, string> = {
      token:  qp['token']  ?? hp.get('token')  ?? '',
      email:  qp['email']  ?? hp.get('email')  ?? '',
      name:   qp['name']   ?? hp.get('name')   ?? '',
      avatar: qp['avatar'] ?? hp.get('avatar') ?? '',
      error:  qp['error']  ?? hp.get('error')  ?? '',
    };

    this.auth.handleOAuthCallback(params);
  }
}
