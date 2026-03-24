import { Component, signal, computed, HostListener, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { ApiService } from '../../services/api.service';

// Default fallback categories (the original 12) — shown if API hasn't loaded yet
const DEFAULT_CATEGORIES = [
  'Banarasi','Kanjivaram','Chanderi','Georgette','Paithani',
  'Chiffon','Bandhani','Linen','Ikat','Mysore Silk','Net','Uppada',
];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  auth    = inject(AuthService);
  cart    = inject(CartService);
  private router = inject(Router);
  private api    = inject(ApiService);

  scrolled   = signal(false);
  searchOpen = signal(false);
  userOpen   = signal(false);
  mobileOpen = signal(false);
  searchQ    = '';

  // Signals so template re-renders when admin adds a category
  categories     = signal<{ name: string; slug?: string }[]>(
    DEFAULT_CATEGORIES.map(n => ({ name: n }))
  );
  announcementText   = signal('✦ &nbsp; Complimentary shipping on orders above ₹10,000 &nbsp; · &nbsp; New Banarasi arrivals this week &nbsp; · &nbsp; Use code VASTRA15 for 15% off &nbsp; ✦');
  announcementActive = signal(true);

  // Split categories for mega menu
  catCol1 = computed(() => this.categories().slice(0, 6));
  catCol2 = computed(() => this.categories().slice(6, 12));

  ngOnInit() {
    this.loadCategories();
    this.loadHomeConfig();
  }

  loadCategories() {
    this.api.get<{ success: boolean; categories: any[] }>('/categories').subscribe({
      next: r => {
        if (r.categories && r.categories.length) {
          this.categories.set(r.categories.filter((c: any) => c.isActive !== false));
        }
        // else keep defaults
      },
      error: () => {}, // silently keep defaults
    });
  }

  loadHomeConfig() {
    this.api.get<any>('/homeconfig').subscribe({
      next: r => {
        const cfg = r.config;
        if (cfg) {
          if (cfg.announcementText   !== undefined) this.announcementText.set(cfg.announcementText);
          if (cfg.announcementActive !== undefined) this.announcementActive.set(cfg.announcementActive);
        }
      },
      error: () => {},
    });
  }

  // Called by admin categories component after adding/editing a category
  // (not needed here — loadCategories runs once; users can refresh)

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 10); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    if (!(e.target as HTMLElement).closest('.user-wrap')) this.userOpen.set(false);
  }

  toggleSearch()   { this.searchOpen.update(v => !v); if (!this.searchOpen()) this.searchQ = ''; }
  toggleUserOpen() { this.userOpen.update(v => !v); }
  toggleMobile()   { this.mobileOpen.update(v => !v); }

  doSearch() {
    if (!this.searchQ.trim()) return;
    this.router.navigate(['/products'], { queryParams: { q: this.searchQ } });
    this.searchOpen.set(false); this.searchQ = '';
  }

  navTo(cat: string)    { this.router.navigate(['/products'], { queryParams: { category: cat } }); }
  navToOcc(occ: string) { this.router.navigate(['/products'], { queryParams: { occasion: occ } }); }

  logout() {
    this.userOpen.set(false);
    this.mobileOpen.set(false);
    this.auth.logout();
  }
}
