import { Component, signal, computed, HostListener, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { ApiService } from '../../services/api.service';

const DEFAULT_CATEGORIES = [
  'Banarasi', 'Kanjivaram', 'Chanderi', 'Georgette', 'Paithani',
  'Chiffon', 'Bandhani', 'Linen', 'Ikat', 'Mysore Silk', 'Net', 'Uppada',
];

interface SearchSuggestion {
  _id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  slug?: string;
}

interface SearchableProduct {
  name?: string;
  category?: string;
  colors?: string[];
  occasion?: string[];
  tags?: string[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  cart = inject(CartService);
  private router = inject(Router);
  private api = inject(ApiService);

  scrolled = signal(false);
  searchOpen = signal(false);
  userOpen = signal(false);
  mobileOpen = signal(false);
  searchQ = '';
  searching = signal(false);
  suggestions = signal<SearchSuggestion[]>([]);
  searchTerms = signal<string[]>([
    'Banarasi',
    'Kanjivaram',
    'Chanderi',
    'Silk',
    'Cotton',
    'Bridal',
    'Wedding',
    'Festive',
    'Party Wear',
    'Handloom',
  ]);

  categories = signal<{ name: string; slug?: string }[]>(
    DEFAULT_CATEGORIES.map((n) => ({ name: n }))
  );
  announcementText = signal('Complimentary shipping on orders above Rs 10,000 · New Banarasi arrivals this week · Use code VASTRA15 for 15% off');
  announcementActive = signal(true);

  catCol1 = computed(() => this.categories().slice(0, 6));
  catCol2 = computed(() => this.categories().slice(6, 12));
  quickSuggestions = computed(() => {
    const q = this.searchQ.trim().toLowerCase();
    if (!q) return [];
    return this.searchTerms()
      .filter((term) => term.toLowerCase().includes(q))
      .slice(0, 4);
  });
  showSuggestions = computed(() => this.searchOpen() && (!!this.searchQ.trim()) && (this.searching() || this.suggestions().length > 0 || this.quickSuggestions().length > 0));

  private searchInput$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.loadCategories();
    this.loadHomeConfig();
    this.loadSearchTerms();

    this.searchInput$
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap((query) => {
          const q = query.trim();
          if (!q) {
            this.searching.set(false);
            return of({ success: true, suggestions: [] as SearchSuggestion[] });
          }
          this.searching.set(true);
          return this.api.get<{ success: boolean; suggestions: SearchSuggestion[] }>('/products/search-suggestions', { q });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.suggestions.set(response.suggestions || []);
          this.searching.set(false);
        },
        error: () => {
          this.suggestions.set([]);
          this.searching.set(false);
        },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories() {
    this.api.get<{ success: boolean; categories: any[] }>('/categories').subscribe({
      next: r => {
        if (r.categories && r.categories.length) {
          this.categories.set(r.categories.filter((c: any) => c.isActive !== false));
        }
      },
      error: () => {},
    });
  }

  loadHomeConfig() {
    this.api.get<any>('/homeconfig').subscribe({
      next: r => {
        const cfg = r.config;
        if (cfg) {
          if (cfg.announcementText !== undefined) this.announcementText.set(cfg.announcementText);
          if (cfg.announcementActive !== undefined) this.announcementActive.set(cfg.announcementActive);
        }
      },
      error: () => {},
    });
  }

  loadSearchTerms() {
    this.api.get<{ success: boolean; products: SearchableProduct[] }>('/products', { limit: 48 }).subscribe({
      next: (response) => {
        const bucket = new Set(this.searchTerms());
        for (const product of response.products || []) {
          if (product.name) bucket.add(product.name);
          if (product.category) bucket.add(product.category);
          (product.tags || []).forEach((tag) => bucket.add(tag));
          (product.colors || []).forEach((color) => bucket.add(color));
          (product.occasion || []).forEach((occasion) => bucket.add(occasion));
        }
        this.searchTerms.set(Array.from(bucket));
      },
      error: () => {},
    });
  }

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 10); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest('.user-wrap')) this.userOpen.set(false);
    if (!target.closest('.search-wrap')) this.closeSearch();
  }

  toggleSearch() {
    const next = !this.searchOpen();
    this.searchOpen.set(next);
    if (!next) this.resetSearchState();
  }

  closeSearch() {
    this.searchOpen.set(false);
    this.resetSearchState();
  }

  onSearchInput(value: string) {
    this.searchQ = value;
    if (!value.trim()) {
      this.suggestions.set([]);
      this.searching.set(false);
      return;
    }
    this.searchInput$.next(value);
  }

  doSearch() {
    const query = this.searchQ.trim();
    if (!query) return;
    this.router.navigate(['/products'], { queryParams: { q: query } });
    this.closeSearch();
  }

  chooseSuggestion(item: SearchSuggestion) {
    this.router.navigate(['/products', item._id]);
    this.closeSearch();
  }

  chooseQuickSuggestion(value: string) {
    this.router.navigate(['/products'], { queryParams: { q: value } });
    this.closeSearch();
  }

  toggleUserOpen() { this.userOpen.update(v => !v); }
  toggleMobile() { this.mobileOpen.update(v => !v); }

  navTo(cat: string) { this.router.navigate(['/products'], { queryParams: { category: cat } }); }
  navToOcc(occ: string) { this.router.navigate(['/products'], { queryParams: { occasion: occ } }); }

  closeUserMenu() { this.userOpen.set(false); }
  closeMobileMenu() { this.mobileOpen.set(false); }

  logout() {
    this.userOpen.set(false);
    this.mobileOpen.set(false);
    this.auth.logout();
  }

  private resetSearchState() {
    this.searchQ = '';
    this.suggestions.set([]);
    this.searching.set(false);
  }
}
