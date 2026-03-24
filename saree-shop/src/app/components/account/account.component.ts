import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { ProductService, Product } from '../../services/product.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
  auth = inject(AuthService);
  orderService = inject(OrderService);
  ps = inject(ProductService);
  toast = inject(ToastService);

  tab = 'profile';
  saving = signal(false);
  loadingOrders = signal(false);
  loadingWishlist = signal(false);
  orders = signal<any[]>([]);
  wishlistProducts = signal<Product[]>([]);
  showAddr = false;

  editName  = this.auth.currentUser()?.name || '';
  editPhone = this.auth.currentUser()?.phone || '';
  currPwd   = '';
  newPwd    = '';

  na = { name: '', phone: '', street: '', city: '', state: '', pincode: '', label: 'Home', isDefault: false };

  tabs = [
    { key: 'profile',   label: 'My Profile',  icon: 'person' },
    { key: 'addresses', label: 'Addresses',    icon: 'location_on' },
    { key: 'orders',    label: 'My Orders',    icon: 'receipt_long' },
    { key: 'wishlist',  label: 'Wishlist',     icon: 'favorite_border' },
  ];

  ngOnInit() {
    // Preload recent orders and wishlist
    this.loadingOrders.set(true);
    this.orderService.getMyOrders(1, 5).subscribe({
      next: r => { this.orders.set(r.orders); this.loadingOrders.set(false); },
      error: () => this.loadingOrders.set(false),
    });
    this.loadWishlist();
  }

  loadWishlist() {
    const ids = this.auth.currentUser()?.wishlist;
    if (!ids || ids.length === 0) { this.wishlistProducts.set([]); return; }

    // Fetch all wishlist products in one query
    this.loadingWishlist.set(true);
    // We fetch products and filter by wishlist IDs
    this.ps.getProducts({ limit: 50 }).subscribe({
      next: r => {
        const wished = r.products.filter(p => ids.includes(p._id));
        this.wishlistProducts.set(wished);
        this.loadingWishlist.set(false);
      },
      error: () => this.loadingWishlist.set(false),
    });
  }

  removeFromWishlist(productId: string) {
    this.auth.toggleWishlist(productId).subscribe({
      next: () => {
        this.wishlistProducts.update(ps => ps.filter(p => p._id !== productId));
        this.toast.success('Removed from wishlist');
      },
      error: (e) => this.toast.error(e.message),
    });
  }

  saveProfile() {
    this.saving.set(true);
    const data: any = { name: this.editName, phone: this.editPhone };
    if (this.currPwd && this.newPwd) {
      data.currentPassword = this.currPwd;
      data.newPassword     = this.newPwd;
    }
    this.auth.updateProfile(data).subscribe({
      next: (r) => {
        this.toast.success(r.message);
        this.saving.set(false);
        this.currPwd = '';
        this.newPwd  = '';
      },
      error: (e) => { this.toast.error(e.message); this.saving.set(false); },
    });
  }

  resetNA() {
    this.na = {
      name: this.auth.currentUser()?.name || '',
      phone: this.auth.currentUser()?.phone || '',
      street: '', city: '', state: '', pincode: '', label: 'Home', isDefault: false
    };
  }

  addAddr() {
    if (!this.na.name || !this.na.street || !this.na.city || !this.na.pincode) {
      this.toast.error('Please fill all required fields.');
      return;
    }
    this.auth.addAddress(this.na).subscribe({
      next: r => { this.toast.success(r.message); this.showAddr = false; },
      error: e => this.toast.error(e.message),
    });
  }

  deleteAddr(id: string) {
    this.auth.deleteAddress(id).subscribe({
      next: () => this.toast.info('Address removed'),
      error: e => this.toast.error(e.message),
    });
  }
}
