import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
selector: 'app-oauth-success',
template: `<p>Logging you in...</p>`,
standalone: true
})
export class OAuthSuccessComponent implements OnInit {

constructor(
private route: ActivatedRoute,
private router: Router,
private authService: AuthService
) {}

ngOnInit(): void {
const token = this.route.snapshot.queryParamMap.get('token');


if (token) {
  // ✅ Use AuthService to store token AND update state
  this.authService.setOAuthSession(token);

  // ✅ Navigate to dashboard after state update
  this.router.navigateByUrl('/dashboard');
} else {
  this.router.navigate(['/login']);
}


}
}
