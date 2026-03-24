import { Injectable, signal, computed } from '@angular/core';
import { Product } from './product.service';

export interface CartItem {
  product: Product;
  quantity: number;
  color: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  items = signal<CartItem[]>(this.loadCart());

  count    = computed(() => this.items().reduce((s, i) => s + i.quantity, 0));
  subtotal = computed(() => this.items().reduce((s, i) => s + i.product.price * i.quantity, 0));
  shipping = computed(() => this.subtotal() >= 10000 ? 0 : 150);
  tax      = computed(() => Math.round(this.subtotal() * 0.05));
  total    = computed(() => this.subtotal() + this.shipping() + this.tax());

  private loadCart(): CartItem[] {
    try { return JSON.parse(localStorage.getItem('vv_cart') || '[]'); } catch { return []; }
  }
  private save() { localStorage.setItem('vv_cart', JSON.stringify(this.items())); }

  addItem(product: Product, qty = 1, color = '') {
    const key = product._id || product.id;
    const existing = this.items().find(i => (i.product._id || i.product.id) === key && i.color === color);
    if (existing) {
      this.items.update(items => items.map(i =>
        (i.product._id || i.product.id) === key && i.color === color
          ? { ...i, quantity: Math.min(i.quantity + qty, i.product.stock) }
          : i
      ));
    } else {
      this.items.update(items => [...items, { product, quantity: qty, color }]);
    }
    this.save();
  }

  removeItem(productId: string, color = '') {
    this.items.update(items =>
      items.filter(i => !((i.product._id === productId || i.product.id === productId) && i.color === color))
    );
    this.save();
  }

  updateQuantity(productId: string, qty: number, color = '') {
    if (qty <= 0) { this.removeItem(productId, color); return; }
    this.items.update(items => items.map(i =>
      (i.product._id === productId || i.product.id === productId) && i.color === color
        ? { ...i, quantity: Math.min(qty, i.product.stock) }
        : i
    ));
    this.save();
  }

  clear() { this.items.set([]); localStorage.removeItem('vv_cart'); }

  toOrderItems(): { product: string; productName: string; quantity: number; color?: string }[] {
    return this.items().map(i => ({
      product: i.product._id || i.product.id,
      productName: i.product.name,
      quantity: i.quantity,
      color: i.color || undefined,
    }));
  }
}
