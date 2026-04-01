import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ProductService, Product } from '../../services/product.service';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit, OnDestroy {
  ps = inject(ProductService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  products = signal<Product[]>([]);
  pagination = signal<any>(null);
  loading = signal(true);
  filtersOpen = signal(false);
  currentPage = signal(1);
  metaLoaded = signal(false);

  selectedCat = 'All';
  selectedOcc = 'All';
  selectedColor = 'All';
  sortBy = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  searchQ = '';
  currentFilter = '';
  pageTitle = 'All Sarees';
  inStockOnly = false;

  categories = ['All'];
  occasions = ['All'];
  colors = ['All'];
  priceBounds = signal({ min: 0, max: 50000 });

  private destroy$ = new Subject<void>();
  private searchInput$ = new Subject<string>();

  pageNumbers() {
    const total = this.pagination()?.pages ?? 0;
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  ngOnInit() {
    this.ps.getMeta().subscribe({
      next: (response) => {
        this.categories = ['All', ...response.meta.categories.map((item) => item._id)];
        this.occasions = ['All', ...response.meta.occasions.map((item) => item._id)];
        this.colors = ['All', ...response.meta.colors.map((item) => item._id)];
        this.priceBounds.set(response.meta.priceRange);
        this.metaLoaded.set(true);
      },
      error: () => this.metaLoaded.set(true),
    });

    this.searchInput$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.syncQueryParams();
        this.loadProducts();
      });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.selectedCat = params['category'] || 'All';
      this.selectedOcc = params['occasion'] || 'All';
      this.selectedColor = params['color'] || 'All';
      this.searchQ = params['q'] || '';
      this.currentFilter = params['filter'] || '';
      this.sortBy = params['sort'] || '';
      this.minPrice = params['minPrice'] ? Number(params['minPrice']) : null;
      this.maxPrice = params['maxPrice'] ? Number(params['maxPrice']) : null;
      this.inStockOnly = params['inStock'] === 'true';
      this.currentPage.set(params['page'] ? Number(params['page']) : 1);
      this.updateTitle();
      this.loadProducts();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateTitle() {
    if (this.searchQ) this.pageTitle = `Results for "${this.searchQ}"`;
    else if (this.currentFilter === 'new') this.pageTitle = 'New Arrivals';
    else if (this.currentFilter === 'bestseller') this.pageTitle = 'Bestsellers';
    else if (this.currentFilter === 'featured') this.pageTitle = 'Featured Sarees';
    else if (this.selectedCat !== 'All') this.pageTitle = `${this.selectedCat} Sarees`;
    else if (this.selectedOcc !== 'All') this.pageTitle = `${this.selectedOcc} Sarees`;
    else if (this.selectedColor !== 'All') this.pageTitle = `${this.selectedColor} Sarees`;
    else this.pageTitle = 'All Sarees';
  }

  loadProducts() {
    this.loading.set(true);
    const params: Record<string, any> = {
      page: this.currentPage(),
      limit: 9,
    };

    if (this.searchQ) params['q'] = this.searchQ;
    if (this.selectedCat !== 'All') params['category'] = this.selectedCat;
    if (this.selectedOcc !== 'All') params['occasion'] = this.selectedOcc;
    if (this.selectedColor !== 'All') params['color'] = this.selectedColor;
    if (this.sortBy) params['sort'] = this.sortBy;
    if (this.minPrice) params['minPrice'] = this.minPrice;
    if (this.maxPrice) params['maxPrice'] = this.maxPrice;
    if (this.inStockOnly) params['inStock'] = true;
    if (this.currentFilter === 'new') params['newArrival'] = true;
    if (this.currentFilter === 'bestseller') params['bestseller'] = true;
    if (this.currentFilter === 'featured') params['featured'] = true;

    this.ps.getProducts(params).subscribe({
      next: (response) => {
        this.products.set(response.products);
        this.pagination.set(response.pagination);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearchChange(value: string) {
    this.searchQ = value;
    this.searchInput$.next(value);
  }

  applyFilters() {
    this.currentPage.set(1);
    this.updateTitle();
    this.syncQueryParams();
    this.loadProducts();
  }

  clearFilters() {
    this.selectedCat = 'All';
    this.selectedOcc = 'All';
    this.selectedColor = 'All';
    this.sortBy = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.searchQ = '';
    this.currentFilter = '';
    this.inStockOnly = false;
    this.applyFilters();
  }

  goPage(page: number) {
    if (page < 1 || page > (this.pagination()?.pages ?? 1)) return;
    this.currentPage.set(page);
    this.syncQueryParams();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.loadProducts();
  }

  syncQueryParams() {
    const queryParams: Record<string, any> = {};
    if (this.selectedCat !== 'All') queryParams['category'] = this.selectedCat;
    if (this.selectedOcc !== 'All') queryParams['occasion'] = this.selectedOcc;
    if (this.selectedColor !== 'All') queryParams['color'] = this.selectedColor;
    if (this.searchQ) queryParams['q'] = this.searchQ;
    if (this.currentFilter) queryParams['filter'] = this.currentFilter;
    if (this.sortBy) queryParams['sort'] = this.sortBy;
    if (this.minPrice) queryParams['minPrice'] = this.minPrice;
    if (this.maxPrice) queryParams['maxPrice'] = this.maxPrice;
    if (this.inStockOnly) queryParams['inStock'] = true;
    if (this.currentPage() > 1) queryParams['page'] = this.currentPage();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }
}
