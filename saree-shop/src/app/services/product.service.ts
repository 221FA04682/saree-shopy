import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Product {
  _id: string;
  id: string;
  name: string;
  slug?: string;
  description: string;
  category: string;
  fabric: string;
  origin: string;
  occasion: string[];
  colors: string[];
  length: string;
  blouseIncluded: boolean;
  tags: string[];
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  sku?: string;
  stock: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  newArrival: boolean;
  bestseller: boolean;
  isActive: boolean;
  reviews?: {
    user?: string;
    name: string;
    rating: number;
    comment: string;
    createdAt?: string;
  }[];
  createdAt?: string;
}

export interface ProductsResponse {
  success: boolean;
  products: Product[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface CatalogMetaResponse {
  success: boolean;
  meta: {
    categories: { _id: string; count: number }[];
    colors: { _id: string; count: number }[];
    occasions: { _id: string; count: number }[];
    priceRange: { min: number; max: number };
  };
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private api = inject(ApiService);
  products = signal<Product[]>([]);

  private norm(p: any): Product {
    return { ...p, id: p._id || p.id || '' };
  }

  getProducts(params: Record<string, any> = {}): Observable<ProductsResponse> {
    return new Observable(obs => {
      this.api.get<ProductsResponse>('/products', params).subscribe({
        next: r => {
          const normed = { ...r, products: r.products.map(p => this.norm(p)) };
          obs.next(normed);
          obs.complete();
        },
        error: e => obs.error(e),
      });
    });
  }

  getById(id: string): Observable<{ success: boolean; product: Product }> {
    return new Observable(obs => {
      this.api.get<{ success: boolean; product: any }>(`/products/${id}`).subscribe({
        next: r => { obs.next({ ...r, product: this.norm(r.product) }); obs.complete(); },
        error: e => obs.error(e),
      });
    });
  }

  getRelated(id: string): Observable<{ success: boolean; products: Product[] }> {
    return new Observable(obs => {
      this.api.get<{ success: boolean; products: any[] }>(`/products/${id}/related`).subscribe({
        next: r => { obs.next({ ...r, products: r.products.map(p => this.norm(p)) }); obs.complete(); },
        error: e => obs.error(e),
      });
    });
  }

  getCategories(): Observable<{ success: boolean; categories: { _id: string; count: number }[] }> {
    return this.api.get('/products/categories');
  }

  getMeta(): Observable<CatalogMetaResponse> {
    return this.api.get('/products/meta');
  }

  create(data: Partial<Product>): Observable<{ success: boolean; message: string; product: Product }> {
    return this.api.post('/products', data);
  }

  update(id: string, data: Partial<Product>): Observable<{ success: boolean; message: string; product: Product }> {
    return this.api.put(`/products/${id}`, data);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.api.delete(`/products/${id}`);
  }

  updateStock(id: string, change: number, reason: string): Observable<{ success: boolean; message: string; stock: number }> {
    return this.api.patch(`/products/${id}/stock`, { change, reason });
  }

  uploadImages(files: File[]): Observable<{ success: boolean; urls: string[] }> {
    const fd = new FormData();
    files.forEach(f => fd.append('images', f));
    return this.api.postFormData('/upload/product', fd);
  }

  addReview(productId: string, rating: number, comment: string) {
    return this.api.post(`/products/${productId}/review`, { rating, comment });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  }

  // Compatibility shims
  filter(_opts: any): Product[] { return this.products(); }
  search(q: string): Product[] { return this.products().filter(p => p.name.toLowerCase().includes(q.toLowerCase())); }
  getFeatured(): Product[] { return this.products().filter(p => p.featured); }
  getNewArrivals(): Product[] { return this.products().filter(p => p.newArrival); }
  getByCategory(cat: string): Product[] { return this.products().filter(p => p.category === cat); }
  getCategories_sync(): string[] { return [...new Set(this.products().map(p => p.category))]; }
}
