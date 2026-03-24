import { Component, Input, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Product } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent {
  @Input() product!: Product;
  isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  cartService = inject(CartService);
  auth = inject(AuthService);
  toast = inject(ToastService);
  ps = inject(ProductService);

  // Local signal to track wishlist state immediately (optimistic UI)
  wishedLocal = signal<boolean | null>(null);

  getStarStr(): string {
    const r = Math.round(this.product.rating);
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }

  isWished(): boolean {
    // Use local override if set (after user clicked), otherwise use server state
    if (this.wishedLocal() !== null) return this.wishedLocal()!;
    return this.auth.isInWishlist(this.product._id);
  }

  toggleWish() {
    if (!this.auth.isLoggedIn()) {
      this.toast.info('Please sign in to save to wishlist');
      return;
    }
    // Optimistically toggle
    const currentState = this.isWished();
    this.wishedLocal.set(!currentState);

    this.auth.toggleWishlist(this.product._id).subscribe({
      next: (r) => {
        // Confirm with server response
        this.wishedLocal.set(r.added);
        this.toast.success(r.added ? '♥ Added to wishlist' : 'Removed from wishlist');
      },
      error: (e) => {
        // Revert on error
        this.wishedLocal.set(currentState);
        this.toast.error(e.message || 'Could not update wishlist');
      },
    });
  }

  addToCart() {
    if (this.product.stock === 0) return;
    this.cartService.addItem(this.product);
    this.toast.success(`${this.product.name} added to bag!`);
  }

  onErr(e: Event) {
    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&q=70';
  }
}
