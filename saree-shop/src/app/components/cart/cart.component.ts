import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent {
  cart = inject(CartService);
  ps = inject(ProductService);
  auth = inject(AuthService);
  toast = inject(ToastService);

  removeItem(id: string, color?: string) {
    this.cart.removeItem(id, color);
    this.toast.info('Item removed from cart');
  }

  onImgError(e: Event) {
    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100x133/1a1510/d4af61?text=S';
  }
}
