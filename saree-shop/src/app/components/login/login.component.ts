import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  auth = inject(AuthService);
  toast = inject(ToastService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  email = ''; password = '';
  showPass = signal(false);
  loading = signal(false);
  error = signal('');

  togglePass() { this.showPass.update(v => !v); }
  fillAdmin() { this.email = 'admin@vastrav.com'; this.password = 'Admin@123'; }
  fillUser()  { this.email = 'priya@example.com'; this.password = 'User@123'; }

  onLogin() {
    if (!this.email || !this.password) { this.error.set('Please enter email and password.'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.toast.success(r.message);
        // Admin always goes to admin panel, never to user pages
        if (this.auth.isAdmin()) {
          this.router.navigate(['/admin']);
        } else {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
          this.router.navigate([returnUrl]);
        }
      },
      error: (e) => { this.loading.set(false); this.error.set(e.message); },
    });
  }
}
