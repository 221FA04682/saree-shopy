import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { OrderService, Order } from '../../services/order.service';
import { ProductService } from '../../services/product.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.scss']
})
export class MyOrdersComponent implements OnInit {
  orderService = inject(OrderService);
  ps = inject(ProductService);
  toast = inject(ToastService);

  orders = signal<Order[]>([]);
  loading = signal(true);
  downloading = signal('');
  expandedOrder = signal<string | null>(null);

  trackSteps = ['Ordered', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
  statusIdx: Record<string, number> = {
    pending: 0, confirmed: 1, processing: 2,
    shipped: 3, out_for_delivery: 3, delivered: 4
  };

  ngOnInit() {
    this.orderService.getMyOrders().subscribe({
      next: (r) => { this.orders.set(r.orders); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  isStepDone(status: string, i: number)    { return (this.statusIdx[status] ?? 0) > i; }
  isCurrentStep(status: string, i: number) { return (this.statusIdx[status] ?? 0) === i; }
  canCancel(status: string)                { return ['pending', 'confirmed'].includes(status); }
  toggleExpand(id: string)                 { this.expandedOrder.update(cur => cur === id ? null : id); }

  // Users only get Invoice download
  downloadInvoice(orderId: string, orderNum: string) {
    this.downloading.set(orderId + '-inv');
    this.orderService.downloadInvoice(orderId).subscribe({
      next: (blob: Blob) => {
        this._saveBlob(blob, `invoice-${orderNum}.pdf`);
        this.downloading.set('');
        this.toast.success('Invoice downloaded!');
      },
      error: (e: any) => { this.toast.error(e.message || 'Download failed'); this.downloading.set(''); },
    });
  }

  cancelOrder(id: string) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    this.orderService.cancelOrder(id, 'Cancelled by customer').subscribe({
      next: (r) => {
        this.toast.success(r.message);
        this.orders.update(os => os.map(o => o._id === id ? { ...o, status: 'cancelled' } : o));
      },
      error: (e) => this.toast.error(e.message),
    });
  }

  private _saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  onImgErr(e: Event) {
    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=100';
  }
}
