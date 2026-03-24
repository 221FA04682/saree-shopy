import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
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

  selectedCat = 'All';
  selectedOcc = 'All';
  sortBy = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  searchQ = '';
  currentFilter = '';
  pageTitle = 'All Sarees';

  categories = ['All','Banarasi','Kanjivaram','Chanderi','Georgette','Paithani','Chiffon','Bandhani','Linen','Ikat','Mysore Silk','Net','Uppada'];
  occasions = ['All','Wedding','Bridal','Party','Festive','Casual','Office'];

  private destroy$ = new Subject<void>();

  pageNumbers() {
    const total = this.pagination()?.pages ?? 0;
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['category']) { this.selectedCat = params['category']; this.currentFilter = params['category']; }
      if (params['occasion']) { this.selectedOcc = params['occasion']; this.currentFilter = params['occasion']; }
      if (params['q'])        { this.searchQ = params['q']; }
      if (params['filter'])   { this.currentFilter = params['filter']; }
      this.updateTitle();
      this.loadProducts();
    });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  updateTitle() {
    if (this.searchQ)             this.pageTitle = `Results for "${this.searchQ}"`;
    else if (this.currentFilter === 'new')        this.pageTitle = 'New Arrivals';
    else if (this.currentFilter === 'bestseller') this.pageTitle = 'Bestsellers';
    else if (this.currentFilter === 'featured')   this.pageTitle = 'Featured';
    else if (this.selectedCat !== 'All')          this.pageTitle = `${this.selectedCat} Sarees`;
    else if (this.selectedOcc !== 'All')          this.pageTitle = `${this.selectedOcc} Sarees`;
    else                                           this.pageTitle = 'All Sarees';
  }

  loadProducts() {
    this.loading.set(true);
    const params: Record<string, any> = {
      page: this.currentPage(),
      limit: 9,
    };
    if (this.searchQ)              params['q'] = this.searchQ;
    if (this.selectedCat !== 'All') params['category'] = this.selectedCat;
    if (this.selectedOcc !== 'All') params['occasion'] = this.selectedOcc;
    if (this.sortBy)               params['sort'] = this.sortBy;
    if (this.minPrice)             params['minPrice'] = this.minPrice;
    if (this.maxPrice)             params['maxPrice'] = this.maxPrice;
    if (this.currentFilter === 'new')        params['newArrival'] = true;
    if (this.currentFilter === 'bestseller') params['bestseller'] = true;
    if (this.currentFilter === 'featured')   params['featured'] = true;

    this.ps.getProducts(params).subscribe({
      next: (r) => {
        this.products.set(r.products.map(p => ({ ...p, id: p._id })));
        this.pagination.set(r.pagination);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilters() { this.currentPage.set(1); this.updateTitle(); this.loadProducts(); }

  clearFilters() {
    this.selectedCat = 'All'; this.selectedOcc = 'All';
    this.sortBy = ''; this.minPrice = null; this.maxPrice = null;
    this.searchQ = ''; this.currentFilter = '';
    this.applyFilters();
  }

  goPage(p: number) {
    if (p < 1 || p > (this.pagination()?.pages ?? 1)) return;
    this.currentPage.set(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.loadProducts();
  }
}
