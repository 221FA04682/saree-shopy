import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface OrderItem {
  product: string;
  productName: string;
  productImage: string;
  category: string;
  color: string;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
}

export interface TrackingEvent {
  status: string;
  description: string;
  location: string;
  timestamp: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user: string;
  userName: string;
  userEmail: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  trackingNumber?: string;
  courier?: string;
  trackingEvents: TrackingEvent[];
  estimatedDelivery?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface PlaceOrderPayload {
  items: { product: string; productName: string; quantity: number; color?: string }[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private api = inject(ApiService);

  // ── User: Place order ────────────────────────────────────────
  placeOrder(payload: PlaceOrderPayload): Observable<{ success: boolean; message: string; order: Partial<Order> }> {
    return this.api.post('/orders', payload);
  }

  // ── User: My orders ──────────────────────────────────────────
  getMyOrders(page = 1, limit = 10): Observable<{ success: boolean; orders: Order[]; total: number; pages: number }> {
    return this.api.get('/orders/my', { page, limit });
  }

  getMyOrderById(id: string): Observable<{ success: boolean; order: Order }> {
    return this.api.get(`/orders/my/${id}`);
  }

  // ── User: Download Invoice (users only get invoice) ──────────
  downloadInvoice(orderId: string): Observable<Blob> {
    return this.api.getBlob(`/orders/my/${orderId}/invoice`);
  }

  // ── User: Cancel order ───────────────────────────────────────
  cancelOrder(id: string, reason: string): Observable<{ success: boolean; message: string }> {
    return this.api.post(`/orders/my/${id}/cancel`, { reason });
  }

  // ── Admin: All orders ────────────────────────────────────────
  adminGetAll(params: Record<string, any> = {}): Observable<{ success: boolean; orders: Order[]; total: number; pages: number }> {
    return this.api.get('/orders/admin/all', params);
  }

  // ── Admin: Stats ─────────────────────────────────────────────
  adminGetStats(): Observable<{ success: boolean; stats: { total: number; revenue: number; pending: number; delivered: number; todayOrders: number } }> {
    return this.api.get('/orders/admin/stats');
  }

  // ── Admin: Update order status ───────────────────────────────
  adminUpdateStatus(id: string, data: { status: string; trackingNumber?: string; courier?: string; description?: string; location?: string }): Observable<{ success: boolean; message: string; order: Order }> {
    return this.api.put(`/orders/admin/${id}/status`, data);
  }

  // ── Admin: Download Invoice ──────────────────────────────────
  adminDownloadInvoice(orderId: string): Observable<Blob> {
    return this.api.getBlob(`/orders/admin/${orderId}/invoice`);
  }

  // ── Admin: Download Shipping Label ───────────────────────────
  adminDownloadShippingLabel(orderId: string): Observable<Blob> {
    return this.api.getBlob(`/orders/admin/${orderId}/print-label`);
  }
}
