import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ProductService, Product } from '../../services/product.service';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule, ProductCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  ps = inject(ProductService);

  featured    = signal<Product[]>([]);
  newArrivals = signal<Product[]>([]);
  bestsellers = signal<Product[]>([]);
  categories  = signal<any[]>([]);

  // Full config from backend — sensible defaults
  cfg = signal<any>({
    announcementText:    '✦ Free Shipping on orders above ₹10,000 · Use code VASTRA15 for 15% off ✦',
    announcementActive:  true,
    heroTitle:           'Where Heritage Meets Haute Couture',
    heroSubtitle:        "Exquisite handcrafted sarees woven by India's most celebrated artisans.",
    heroCTA:             'Explore Collection',
    heroImage:           '',
    heroSidebarCards:    [
      { cat: 'Banarasi',   image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=300&q=80' },
      { cat: 'Kanjivaram', image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=300&q=80' },
      { cat: 'Chanderi',   image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=300&q=80' },
    ],
    promoBannerActive:    true,
    promoBannerTitle:     'Bridal Season Sale',
    promoBannerSubtitle:  'Bridal Season 2024',
    promoBannerText:      'Up to 30% off on our exclusive bridal collection.',
    promoBannerBadge:     '30%',
    promoBannerOfferLabel:'Bridal Season Sale',
    promoBannerOfferSub:  'On selected bridal & festive pieces',
    promoBannerImage:     '',
    promoBannerLink:      '/products?occasion=Wedding',
    promoBannerCTA:       'Shop Bridal →',
  });

  marqueeTags = ['Banarasi Silk','Kanjivaram','Chanderi','Georgette','Paithani','Pochampalli Ikat','Mysore Silk','Bandhani','GI Certified','Free Shipping'];

  values = [
    { icon: 'local_shipping', title: 'Free Shipping',           desc: 'Complimentary on all orders above ₹10,000' },
    { icon: 'verified',       title: 'Authenticity Guaranteed', desc: 'GI-tagged and certified weaves, every time' },
    { icon: 'cached',         title: 'Easy Returns',            desc: '7-day hassle-free returns on all orders' },
    { icon: 'support_agent',  title: 'Expert Styling Help',     desc: 'Personal stylists available 9am–9pm daily' },
  ];

  testimonials = [
    { quote: "The Banarasi silk I ordered was beyond beautiful — the zari work so intricate. I wore it to my daughter's wedding and received compliments all evening.", name: 'Sunita Sharma',  loc: 'Mumbai, Maharashtra' },
    { quote: 'Vastra Vaibhav is my go-to for authentic sarees. The packaging was luxurious and the saree arrived in perfect condition. Will definitely order again!',  name: 'Deepa Krishnan', loc: 'Bangalore, Karnataka' },
    { quote: "I bought the Pochampally Ikat and it's simply stunning. You can feel the quality immediately. Fast delivery and amazing customer service!",               name: 'Radha Pillai',    loc: 'Hyderabad, Telangana' },
  ];

  instaImgs = [
    'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=300&q=80',
    'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=300&q=80',
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80',
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=300&q=80',
    'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=300&q=80',
    'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=300&q=80',
  ];

  ngOnInit() {
    this.api.get<any>('/homeconfig').subscribe({
      next: r => {
        if (r.config) {
          // Merge backend config into defaults
          this.cfg.set({ ...this.cfg(), ...r.config });
        }
        this.featured.set((r.featuredProducts || []).map((p: any) => ({ ...p, id: p._id })));
        this.newArrivals.set((r.newArrivals    || []).map((p: any) => ({ ...p, id: p._id })));
        this.bestsellers.set((r.bestsellers || []).map((p: any) => ({ ...p, id: p._id })));
      },
      error: () => {
        this.ps.getProducts({ featured:   true, limit: 4 }).subscribe(r => this.featured.set(r.products));
        this.ps.getProducts({ newArrival: true, limit: 4 }).subscribe(r => this.newArrivals.set(r.products));
        this.ps.getProducts({ bestseller: true, limit: 4 }).subscribe(r => this.bestsellers.set(r.products));
      },
    });

    this.api.get<any>('/categories').subscribe({
      next: r => this.categories.set(r.categories || []),
      error: () => {},
    });
  }

  getHeroImage(): string {
    return this.cfg().heroImage ||
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1600&q=90';
  }

  getPromoBannerImage(): string {
    return this.cfg().promoBannerImage ||
      'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=700&q=85';
  }

  getPromoBannerRoute(): { path: string[]; queryParams: Record<string, string> } {
    const link = this.cfg().promoBannerLink || '/products?occasion=Wedding';
    const [pathPart, queryPart] = link.split('?');
    const queryParams: Record<string, string> = {};
    if (queryPart) {
      const search = new URLSearchParams(queryPart);
      search.forEach((value, key) => { queryParams[key] = value; });
    }
    return {
      path: [pathPart || '/products'],
      queryParams,
    };
  }

  getHeroSidebarCards(): { cat: string; image: string }[] {
    const cards = this.cfg().heroSidebarCards;
    if (cards && cards.length) return cards;
    return [
      { cat: 'Banarasi',   image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=300&q=80' },
      { cat: 'Kanjivaram', image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=300&q=80' },
      { cat: 'Chanderi',   image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=300&q=80' },
    ];
  }

  getCategoriesForDisplay(): any[] {
    const cats = this.categories();
    if (cats.length > 0) return cats.slice(0, 4);
    return [
      { name: 'Banarasi',   productCount: 48, image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=700&q=85' },
      { name: 'Kanjivaram', productCount: 36, image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=500&q=85' },
      { name: 'Chanderi',   productCount: 24, image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=85' },
      { name: 'Georgette',  productCount: 52, image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500&q=85' },
    ];
  }
}
