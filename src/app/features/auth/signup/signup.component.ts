import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'qm-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  form!: FormGroup;
  loading        = false;
  googleLoading  = false;
  showPassword   = false;
  errorMessage   = '';
  successMessage = '';

  ngOnInit(): void {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get email()    { return this.form.get('email')!;    }
  get password() { return this.form.get('password')!; }

  togglePassword(): void { this.showPassword = !this.showPassword; }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading       = true;
    this.errorMessage  = '';
    this.successMessage = '';

    this.auth.register(this.form.value).subscribe({
      next: () => {
        this.successMessage = '✓ Account created! You can now sign in.';
        this.form.reset();
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 1600);
      },
      error: (err: Error) => {
        this.errorMessage = err.message || 'Registration failed. Try a different email.';
        this.loading = false;
      },
    });
  }

  onGoogleLogin(): void {
    this.googleLoading = true;
    this.auth.initiateGoogleLogin();
  }
}
