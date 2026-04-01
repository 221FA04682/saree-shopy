import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../../services/product.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.scss']
})
export class AdminProductsComponent implements OnInit {
  ps = inject(ProductService);
  private api = inject(ApiService);
  auth = inject(AuthService);
  toast = inject(ToastService);

  products = signal<Product[]>([]);
  loading = signal(true);
  total = signal(0);
  modalOpen = signal(false);
  editing = signal<Product | null>(null);
  deleteTarget = signal<Product | null>(null);
  stockModal = signal<Product | null>(null);
  saving = signal(false);
  uploadedUrls = signal<string[]>([]);

  searchQ = '';
  catFilter = '';
  stockChange = 0;
  stockReason = 'restock';
  categories: string[] = [];
  categoriesLoading = false;

  form: any = this.blankForm();

  blankForm() {
    return { name:'', category:'Banarasi', description:'', price:0, originalPrice:0, stock:10, origin:'', fabric:'', colors:'Red, Gold', occasion:'Wedding, Party', imageUrl:'', sku:'', tags:'', newArrival:false, bestseller:false, featured:false, blouseIncluded:true };
  }

  ngOnInit() {
    this.load();
    this.loadCategories();
  }

  loadCategories() {
    this.api.get<any>('/categories/all').subscribe({
      next: r => {
        this.categories = (r.categories || []).filter((c: any) => c.isActive).map((c: any) => c.name);
        if (this.categories.length > 0 && !this.form.category) {
          this.form.category = this.categories[0];
        }
      },
      error: () => {},
    });
  }

  load() {
    this.loading.set(true);
    const params: any = { limit: 50 };
    if (this.searchQ) params['q'] = this.searchQ;
    if (this.catFilter) params['category'] = this.catFilter;
    this.ps.getProducts(params).subscribe({
      next: (r) => { this.products.set(r.products); this.total.set(r.pagination.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openAdd() { this.form = this.blankForm(); this.editing.set(null); this.uploadedUrls.set([]); this.modalOpen.set(true); }
  openEdit(p: Product) {
    this.form = {
      name: p.name, category: p.category, description: p.description,
      price: p.price, originalPrice: p.originalPrice||0, stock: p.stock,
      origin: p.origin, fabric: p.fabric,
      colors: p.colors.join(', '), occasion: p.occasion.join(', '),
      imageUrl: p.images[0]||'',
      sku: p.sku || '',
      tags: (p.tags || []).join(', '),
      newArrival: p.newArrival, bestseller: p.bestseller, featured: p.featured, blouseIncluded: p.blouseIncluded,
    };
    this.editing.set(p); this.uploadedUrls.set([]); this.modalOpen.set(true);
  }
  closeModal() { this.modalOpen.set(false); this.editing.set(null); }

  onFileChange(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    if (!files.length) return;
    this.ps.uploadImages(files).subscribe({
      next: (r) => { this.uploadedUrls.set(r.urls); this.toast.success(`${r.urls.length} image(s) uploaded`); },
      error: (e) => this.toast.error(e.message),
    });
  }

  save() {
    if (!this.form.name || this.form.price <= 0) { this.toast.error('Name and price are required.'); return; }
    this.saving.set(true);
    const images = this.uploadedUrls().length ? this.uploadedUrls() : (this.form.imageUrl ? [this.form.imageUrl] : []);
    const data: any = {
      ...this.form,
      colors: this.form.colors.split(',').map((s: string) => s.trim()).filter(Boolean),
      occasion: this.form.occasion.split(',').map((s: string) => s.trim()).filter(Boolean),
      images,
      sku: this.form.sku || undefined,
      tags: this.form.tags
        ? this.form.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [this.form.category, this.form.fabric].filter(Boolean),
      length: '6.3m',
    };
    delete data.imageUrl;

    const op = this.editing()
      ? this.ps.update(this.editing()!._id, data)
      : this.ps.create(data);

    op.subscribe({
      next: (r) => { this.toast.success((r as any).message || 'Saved!'); this.closeModal(); this.saving.set(false); this.load(); },
      error: (e) => { this.toast.error(e.message); this.saving.set(false); },
    });
  }

  askDelete(p: Product) { this.deleteTarget.set(p); }
  doDelete() {
    this.ps.delete(this.deleteTarget()!._id).subscribe({
      next: () => { this.toast.success('Product removed.'); this.deleteTarget.set(null); this.load(); },
      error: (e) => this.toast.error(e.message),
    });
  }

  openStock(p: Product) { this.stockModal.set(p); this.stockChange = 0; this.stockReason = 'restock'; }
  saveStock() {
    if (!this.stockChange) { this.toast.error('Enter a change value.'); return; }
    this.ps.updateStock(this.stockModal()!._id, Number(this.stockChange), this.stockReason).subscribe({
      next: (r) => { this.toast.success(`Stock updated! New stock: ${r.stock}`); this.stockModal.set(null); this.load(); },
      error: (e) => this.toast.error(e.message),
    });
  }

  onImgErr(e: Event) { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=200'; }
}
