import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent {
  cart = inject(CartService);
  auth = inject(AuthService);
  orderService = inject(OrderService);
  ps = inject(ProductService);
  toast = inject(ToastService);
  router = inject(Router);

  step = signal(1);
  placing = signal(false);
  placedOrderNumber = signal('');
  payMethod = 'UPI';
  showNewAddr = false;
  saveAddr = true;
  selAddr: any = this.auth.currentUser()?.addresses?.find(a => a.isDefault) || this.auth.currentUser()?.addresses?.[0] || null;

  get user() { return this.auth.currentUser(); }

  na = { name: this.user?.name||'', phone: this.user?.phone||'', street:'', city:'', state:'', pincode:'' };

  payMethods = [
    { value:'UPI',        name:'UPI Payment',        desc:'GPay, PhonePe, Paytm & more',      icon:'qr_code_scanner' },
    { value:'Card',       name:'Credit / Debit Card', desc:'Visa, Mastercard, RuPay',          icon:'credit_card' },
    { value:'NetBanking', name:'Net Banking',         desc:'All major banks supported',         icon:'account_balance' },
    { value:'COD',        name:'Cash on Delivery',    desc:'Pay when order arrives',            icon:'payments' },
  ];

  getAddr() {
    if (this.selAddr) return this.selAddr;
    if (this.na.name && this.na.street && this.na.city && this.na.pincode) return this.na;
    return null;
  }

  goStep2() {
    if (!this.getAddr()) { this.toast.error('Please select or enter a delivery address.'); return; }
    // Save new address if requested
    if (this.showNewAddr && this.saveAddr && this.na.name) {
      this.auth.addAddress({ ...this.na, label: 'Home', isDefault: false }).subscribe();
    }
    this.step.set(2);
  }

  placeOrder() {
    const addr = this.getAddr();
    if (!addr) return;
    this.placing.set(true);
    this.orderService.placeOrder({
      items: this.cart.toOrderItems(),
      shippingAddress: addr,
      paymentMethod: this.payMethod,
    }).subscribe({
      next: (r) => {
        this.cart.clear();
        this.placedOrderNumber.set(r.order.orderNumber || '');
        this.placing.set(false);
        this.step.set(4);
      },
      error: (e) => {
        this.toast.error(e.message);
        this.placing.set(false);
      },
    });
  }
}
