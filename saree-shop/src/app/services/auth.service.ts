import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  wishlist: string[];
  addresses: Address[];
  createdAt?: string;
}

export interface Address {
  _id?: string;
  label: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  isLoggedIn  = computed(() => !!this.currentUser());
  isAdmin     = computed(() => this.currentUser()?.role === 'admin');

  constructor() { this.restoreSession(); }

  private restoreSession() {
    const token = localStorage.getItem('vv_token');
    const userData = localStorage.getItem('vv_user');
    if (token && userData) {
      try {
        this.currentUser.set(JSON.parse(userData));
        this.api.get<{ success: boolean; user: User }>('/auth/me').subscribe({
          next: (r) => { this.currentUser.set(r.user); localStorage.setItem('vv_user', JSON.stringify(r.user)); },
          error: () => this.logout(),
        });
      } catch { this.logout(); }
    }
  }

  register(name: string, email: string, password: string, phone: string) {
    return this.api.post<{ success: boolean; message: string; token: string; user: User }>(
      '/auth/register', { name, email, password, phone }
    ).pipe(tap(r => {
      if (r.success) { localStorage.setItem('vv_token', r.token); localStorage.setItem('vv_user', JSON.stringify(r.user)); this.currentUser.set(r.user); }
    }));
  }

  login(email: string, password: string) {
    return this.api.post<{ success: boolean; message: string; token: string; user: User }>(
      '/auth/login', { email, password }
    ).pipe(tap(r => {
      if (r.success) { localStorage.setItem('vv_token', r.token); localStorage.setItem('vv_user', JSON.stringify(r.user)); this.currentUser.set(r.user); }
    }));
  }

  logout() {
    localStorage.removeItem('vv_token'); localStorage.removeItem('vv_user');
    this.currentUser.set(null); this.router.navigate(['/']);
  }

  updateProfile(data: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) {
    return this.api.put<{ success: boolean; message: string; user: User }>('/auth/me', data)
      .pipe(tap(r => { if (r.success) { this.currentUser.set(r.user); localStorage.setItem('vv_user', JSON.stringify(r.user)); } }));
  }

  addAddress(address: Omit<Address, '_id'>) {
    return this.api.post<{ success: boolean; message: string; addresses: Address[] }>('/auth/address', address)
      .pipe(tap(r => { if (r.success && this.currentUser()) { const u = { ...this.currentUser()!, addresses: r.addresses }; this.currentUser.set(u); localStorage.setItem('vv_user', JSON.stringify(u)); } }));
  }

  deleteAddress(id: string) {
    return this.api.delete<{ success: boolean; addresses: Address[] }>(`/auth/address/${id}`)
      .pipe(tap(r => { if (r.success && this.currentUser()) { const u = { ...this.currentUser()!, addresses: r.addresses }; this.currentUser.set(u); localStorage.setItem('vv_user', JSON.stringify(u)); } }));
  }

  toggleWishlist(productId: string) {
    return this.api.post<{ success: boolean; added: boolean; wishlist: string[] }>(`/auth/wishlist/${productId}`, {})
      .pipe(tap(r => { if (r.success && this.currentUser()) { const u = { ...this.currentUser()!, wishlist: r.wishlist }; this.currentUser.set(u); localStorage.setItem('vv_user', JSON.stringify(u)); } }));
  }

  isInWishlist(productId: string): boolean { return this.currentUser()?.wishlist?.includes(productId) ?? false; }

  // kept for compatibility
  getAllUsers() { return []; }
}
