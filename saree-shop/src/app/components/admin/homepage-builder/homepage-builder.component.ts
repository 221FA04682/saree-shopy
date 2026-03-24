import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { ProductService, Product } from '../../../services/product.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-homepage-builder',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './homepage-builder.component.html',
  styleUrls: ['./homepage-builder.component.scss']
})
export class HomepageBuilderComponent implements OnInit {
  private api   = inject(ApiService);
  auth          = inject(AuthService);
  ps            = inject(ProductService);
  toast         = inject(ToastService);

  loading = signal(true);
  saving  = signal(false);
  activeTab = 'announcement';

  allProducts = signal<Product[]>([]);

  // ── Use signals for everything so Angular detects changes ──
  announcementText   = signal('✦ Free Shipping on orders above ₹10,000 · Use code VASTRA15 for 15% off ✦');
  announcementActive = signal(true);

  heroTitle    = signal('Where Heritage Meets Haute Couture');
  heroSubtitle = signal("Exquisite handcrafted sarees woven by India's most celebrated artisans.");
  heroCTA      = signal('Explore Collection');
  heroImage    = signal('');

  // Hero sidebar cards — 3 entries
  heroSidebarCards = signal<{cat: string; image: string}[]>([
    { cat: 'Banarasi',   image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=300&q=80' },
    { cat: 'Kanjivaram', image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=300&q=80' },
    { cat: 'Chanderi',   image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=300&q=80' },
  ]);

  // Featured — signal so [class.selected] reacts instantly
  featuredIds    = signal<string[]>([]);
  newArrivalIds  = signal<string[]>([]);
  newArrivalsMode = signal<'auto' | 'manual'>('auto');

  // Promo banner
  promoBannerActive     = signal(true);
  promoBannerTitle      = signal('Bridal Season Sale');
  promoBannerSubtitle   = signal('Bridal Season 2024');
  promoBannerText       = signal('Up to 30% off on our exclusive bridal collection.');
  promoBannerBadge      = signal('30%');
  promoBannerOfferLabel = signal('Bridal Season Sale');
  promoBannerOfferSub   = signal('On selected bridal & festive pieces');
  promoBannerImage      = signal('');
  promoBannerLink       = signal('/products?occasion=Wedding');
  promoBannerCTA        = signal('Shop Bridal →');

  tabs = [
    { key: 'announcement', label: 'Announcement',    icon: 'campaign' },
    { key: 'hero',         label: 'Hero Section',     icon: 'photo_size_select_large' },
    { key: 'hero_images',  label: 'Hero Side Images', icon: 'view_carousel' },
    { key: 'featured',     label: 'Featured',         icon: 'star' },
    { key: 'new_arrivals', label: 'New Arrivals',      icon: 'fiber_new' },
    { key: 'promo_banner', label: 'Promo Banner',      icon: 'local_offer' },
  ];

  ngOnInit() {
    this.loadConfig();
    this.loadProducts();
  }

  loadConfig() {
    this.api.get<any>('/homeconfig/admin').subscribe({
      next: r => {
        const c = r.config || {};
        if (c.announcementText   !== undefined) this.announcementText.set(c.announcementText);
        if (c.announcementActive !== undefined) this.announcementActive.set(c.announcementActive);
        if (c.heroTitle          !== undefined) this.heroTitle.set(c.heroTitle);
        if (c.heroSubtitle       !== undefined) this.heroSubtitle.set(c.heroSubtitle);
        if (c.heroCTA            !== undefined) this.heroCTA.set(c.heroCTA);
        if (c.heroImage          !== undefined) this.heroImage.set(c.heroImage);
        if (c.heroSidebarCards   && c.heroSidebarCards.length) this.heroSidebarCards.set(c.heroSidebarCards);
        if (c.newArrivalsMode    !== undefined) this.newArrivalsMode.set(c.newArrivalsMode);

        // IDs already stringified by backend
        this.featuredIds.set((c.featuredProductIds   || []).map((x: any) => String(x)));
        this.newArrivalIds.set((c.newArrivalProductIds || []).map((x: any) => String(x)));

        if (c.promoBannerActive     !== undefined) this.promoBannerActive.set(c.promoBannerActive);
        if (c.promoBannerTitle      !== undefined) this.promoBannerTitle.set(c.promoBannerTitle);
        if (c.promoBannerSubtitle   !== undefined) this.promoBannerSubtitle.set(c.promoBannerSubtitle);
        if (c.promoBannerText       !== undefined) this.promoBannerText.set(c.promoBannerText);
        if (c.promoBannerBadge      !== undefined) this.promoBannerBadge.set(c.promoBannerBadge);
        if (c.promoBannerOfferLabel !== undefined) this.promoBannerOfferLabel.set(c.promoBannerOfferLabel);
        if (c.promoBannerOfferSub   !== undefined) this.promoBannerOfferSub.set(c.promoBannerOfferSub);
        if (c.promoBannerImage      !== undefined) this.promoBannerImage.set(c.promoBannerImage);
        if (c.promoBannerLink       !== undefined) this.promoBannerLink.set(c.promoBannerLink);
        if (c.promoBannerCTA        !== undefined) this.promoBannerCTA.set(c.promoBannerCTA);

        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadProducts() {
    this.ps.getProducts({ limit: 100 }).subscribe({
      next: r => this.allProducts.set(r.products),
      error: () => {},
    });
  }

  // ── Featured helpers ─────────────────────────────────────────
  isFeatured(id: string): boolean {
    return this.featuredIds().includes(String(id));
  }

  toggleFeatured(id: string) {
    const sid = String(id);
    if (this.isFeatured(sid)) {
      this.featuredIds.update(ids => ids.filter(x => x !== sid));
    } else {
      if (this.featuredIds().length >= 8) { this.toast.warning('Max 8 featured products'); return; }
      this.featuredIds.update(ids => [...ids, sid]);
    }
  }

  // ── New Arrival helpers ──────────────────────────────────────
  isNewArrival(id: string): boolean {
    return this.newArrivalIds().includes(String(id));
  }

  toggleNewArrival(id: string) {
    const sid = String(id);
    if (this.isNewArrival(sid)) {
      this.newArrivalIds.update(ids => ids.filter(x => x !== sid));
    } else {
      if (this.newArrivalIds().length >= 8) { this.toast.warning('Max 8 new arrival products'); return; }
      this.newArrivalIds.update(ids => [...ids, sid]);
    }
  }

  // ── Hero sidebar helpers ─────────────────────────────────────
  updateHeroCard(i: number, field: 'cat' | 'image', val: string) {
    this.heroSidebarCards.update(cards => {
      const updated = [...cards];
      updated[i] = { ...updated[i], [field]: val };
      return updated;
    });
  }

  addHeroCard() {
    if (this.heroSidebarCards().length >= 4) { this.toast.warning('Max 4 hero side images'); return; }
    this.heroSidebarCards.update(c => [...c, { cat: '', image: '' }]);
  }

  removeHeroCard(i: number) {
    this.heroSidebarCards.update(cards => cards.filter((_, idx) => idx !== i));
  }

  // ── Save all ─────────────────────────────────────────────────
  save() {
    this.saving.set(true);
    const payload = {
      announcementText:    this.announcementText(),
      announcementActive:  this.announcementActive(),
      heroTitle:           this.heroTitle(),
      heroSubtitle:        this.heroSubtitle(),
      heroCTA:             this.heroCTA(),
      heroImage:           this.heroImage(),
      heroSidebarCards:    this.heroSidebarCards(),
      featuredProductIds:  this.featuredIds(),
      newArrivalsMode:     this.newArrivalsMode(),
      newArrivalProductIds:this.newArrivalIds(),
      promoBannerActive:   this.promoBannerActive(),
      promoBannerTitle:    this.promoBannerTitle(),
      promoBannerSubtitle: this.promoBannerSubtitle(),
      promoBannerText:     this.promoBannerText(),
      promoBannerBadge:    this.promoBannerBadge(),
      promoBannerOfferLabel: this.promoBannerOfferLabel(),
      promoBannerOfferSub:   this.promoBannerOfferSub(),
      promoBannerImage:    this.promoBannerImage(),
      promoBannerLink:     this.promoBannerLink(),
      promoBannerCTA:      this.promoBannerCTA(),
    };

    this.api.put<any>('/homeconfig', payload).subscribe({
      next:  r => { this.toast.success(r.message || 'Homepage saved!'); this.saving.set(false); },
      error: (e: any) => { this.toast.error(e.message || 'Save failed'); this.saving.set(false); },
    });
  }
}
