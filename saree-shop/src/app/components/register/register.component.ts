import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  auth = inject(AuthService);
  toast = inject(ToastService);
  router = inject(Router);
  name = ''; email = ''; phone = ''; password = '';
  showPass = signal(false);
  loading = signal(false);
  error = signal('');

  togglePass() { this.showPass.update(v => !v); }

  onRegister() {
    if (this.password.length < 6) { this.error.set('Password must be at least 6 characters.'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.register(this.name, this.email, this.password, this.phone).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.toast.success('Account created! Welcome to Vastra Vaibhav 🎉');
        this.router.navigate(['/']);
      },
      error: (e) => { this.loading.set(false); this.error.set(e.message); },
    });
  }
}
