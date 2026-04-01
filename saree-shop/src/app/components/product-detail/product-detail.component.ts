import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../services/product.service';

import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  ps = inject(ProductService);
  cart = inject(CartService);
  auth = inject(AuthService);
  toast = inject(ToastService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  product = signal<Product | null>(null);
  related = signal<Product[]>([]);
  loading = signal(true);
  activeImg = signal('');
  selColor = signal('');
  qty = signal(1);
  activeTab = signal('Description');
  tabs = ['Description', 'Details', 'Care', 'Reviews'];

  reviewRating = signal(5);
  reviewComment = '';
  submittingReview = signal(false);

  ngOnInit() {
    this.route.params.subscribe(p => {
      this.loading.set(true);
      this.loadProduct(p['id']);
    });
  }

  loadProduct(id: string, keepScroll = false) {
    this.ps.getById(id).subscribe({
      next: (r) => {
        const prod = { ...r.product, id: r.product._id };
        this.product.set(prod);
        if (!this.activeImg()) this.activeImg.set(prod.images[0] || '');
        if (!this.selColor()) this.selColor.set(prod.colors[0] || '');
        this.loading.set(false);
        if (!keepScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
        this.ps.getRelated(r.product._id).subscribe(rel => {
          this.related.set(rel.products.map(p2 => ({ ...p2, id: p2._id })));
        });
      },
      error: () => this.loading.set(false),
    });
  }

  starStr() {
    const r = Math.round(this.product()?.rating ?? 0);
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }
  isWish() { return this.auth.isInWishlist(this.product()?._id ?? ''); }
  toggleWish() {
    if (!this.auth.isLoggedIn()) { this.toast.info('Please sign in to save to wishlist'); return; }
    this.auth.toggleWishlist(this.product()!._id).subscribe({
      next: (r) => this.toast.success(r.added ? 'Added to wishlist ♥' : 'Removed from wishlist'),
      error: (e) => this.toast.error(e.message),
    });
  }
  incQty() { if (this.qty() < (this.product()?.stock ?? 0)) this.qty.update(q => q + 1); }
  decQty() { if (this.qty() > 1) this.qty.update(q => q - 1); }
  addToCart() {
    if (!this.product() || this.product()!.stock === 0) return;
    this.cart.addItem(this.product()!, this.qty(), this.selColor());
    this.toast.success(`${this.product()!.name} added to bag!`);
  }
  buyNow() {
    this.addToCart();
    this.router.navigate(['/cart']);
  }
  submitReview() {
    if (!this.reviewComment.trim()) { this.toast.error('Please write a comment.'); return; }
    this.submittingReview.set(true);
    this.ps.addReview(this.product()!._id, this.reviewRating(), this.reviewComment).subscribe({
      next: (response: any) => {
        this.toast.success('Review submitted!');
        if (response.product) {
          const updated = { ...response.product, id: response.product._id };
          this.product.set(updated);
        } else {
          this.loadProduct(this.product()!._id, true);
        }
        this.reviewComment = '';
        this.activeTab.set('Reviews');
        this.submittingReview.set(false);
      },
      error: (e) => { this.toast.error(e.message); this.submittingReview.set(false); },
    });
  }
  onImgErr(e: Event) { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600'; }
}
