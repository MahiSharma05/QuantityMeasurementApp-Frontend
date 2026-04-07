import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'qm-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private auth    = inject(AuthService);
  private router  = inject(Router);
  private route   = inject(ActivatedRoute);

  form!: FormGroup;
  loading        = false;
  googleLoading  = false;
  showPassword   = false;
  errorMessage   = '';

  ngOnInit(): void {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    // Show OAuth error if redirected here after failed Google login
    this.route.queryParams.subscribe(params => {
      const err = params['oauthError'];
      if (err) {
        this.errorMessage = `Google sign-in failed: ${err.replace(/_/g, ' ')}`;
      }
    });
  }

  get email()    { return this.form.get('email')!;    }
  get password() { return this.form.get('password')!; }

  togglePassword(): void { this.showPassword = !this.showPassword; }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading      = true;
    this.errorMessage = '';

    this.auth.login(this.form.value).subscribe({
      next: () => {
        console.log('[Login] success, token saved');

        // ✅ FIX 2: delay navigation slightly
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 0);
      },
      error: (err: Error) => {
        this.errorMessage = err.message || 'Login failed. Check your credentials.';
        this.loading = false;
      },
    });
  }

  onGoogleLogin(): void {
    this.googleLoading = true;
    this.auth.initiateGoogleLogin();
  }
}
