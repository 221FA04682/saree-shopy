import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  toast = inject(ToastService);

  users = signal<any[]>([]);
  loading = signal(true);
  total = signal(0);
  searchQ = '';
  roleFilter = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: any = { limit: 30 };
    if (this.searchQ) params['q'] = this.searchQ;
    if (this.roleFilter) params['role'] = this.roleFilter;
    this.api.get<any>('/users', params).subscribe({
      next: (r) => { this.users.set(r.users); this.total.set(r.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  toggleActive(id: string, current: boolean) {
    this.api.patch<any>(`/users/${id}/toggle-active`, {}).subscribe({
      next: (r) => { this.toast.success(r.message); this.users.update(us => us.map(u => u._id===id ? {...u, isActive:r.isActive} : u)); },
      error: (e) => this.toast.error(e.message),
    });
  }
}
