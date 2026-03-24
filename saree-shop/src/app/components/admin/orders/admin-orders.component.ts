import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../../../services/order.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.scss']
})
export class AdminOrdersComponent implements OnInit {
  auth = inject(AuthService);
  orderService = inject(OrderService);
  toast = inject(ToastService);

  orders = signal<Order[]>([]);
  loading = signal(true);
  total = signal(0);
  pages = signal(1);
  page = signal(1);
  selected = signal<Order | null>(null);
  downloading = signal('');

  searchQ = '';
  statusFilter = '';
  statuses = ['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','returned'];

  updateForm = { status: 'confirmed', trackingNumber: '', courier: '', description: '' };

  pageArr() { return Array.from({ length: this.pages() }, (_, i) => i + 1); }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: any = { page: this.page(), limit: 15 };
    if (this.searchQ)      params['q']      = this.searchQ;
    if (this.statusFilter) params['status'] = this.statusFilter;
    this.orderService.adminGetAll(params).subscribe({
      next: (r) => { this.orders.set(r.orders); this.total.set(r.total); this.pages.set(r.pages); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  goPage(p: number) { if (p < 1 || p > this.pages()) return; this.page.set(p); this.load(); }

  viewOrder(o: Order) {
    this.selected.set(o);
    this.updateForm = { status: o.status, trackingNumber: o.trackingNumber || '', courier: o.courier || '', description: '' };
  }

  updateStatus(id: string, status: string) {
    this.orderService.adminUpdateStatus(id, { status }).subscribe({
      next: (r) => { this.toast.success(r.message); this.load(); },
      error: (e) => this.toast.error(e.message),
    });
  }

  saveUpdate() {
    if (!this.selected()) return;
    this.orderService.adminUpdateStatus(this.selected()!._id, this.updateForm).subscribe({
      next: (r) => { this.toast.success(r.message); this.selected.set(r.order); this.load(); },
      error: (e) => this.toast.error(e.message),
    });
  }

  // Admin: Download Invoice
  downloadInvoice(orderId: string, orderNum: string) {
    this.downloading.set(orderId + '-inv');
    this.orderService.adminDownloadInvoice(orderId).subscribe({
      next: (blob: Blob) => {
        this._saveBlob(blob, `invoice-${orderNum}.pdf`);
        this.downloading.set('');
        this.toast.success('Invoice downloaded!');
      },
      error: (e: any) => { this.toast.error(e.message || 'Download failed'); this.downloading.set(''); },
    });
  }

  // Admin: Download Shipping Label
  downloadLabel(orderId: string, orderNum: string) {
    this.downloading.set(orderId + '-label');
    this.orderService.adminDownloadShippingLabel(orderId).subscribe({
      next: (blob: Blob) => {
        this._saveBlob(blob, `shipping-label-${orderNum}.pdf`);
        this.downloading.set('');
        this.toast.success('Shipping label downloaded!');
      },
      error: (e: any) => { this.toast.error(e.message || 'Download failed'); this.downloading.set(''); },
    });
  }

  private _saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
}
