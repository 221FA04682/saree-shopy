import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './admin-categories.component.html',
  styleUrls: ['./admin-categories.component.scss']
})
export class AdminCategoriesComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  toast = inject(ToastService);

  categories = signal<Category[]>([]);
  loading = signal(true);
  saving = signal(false);
  modalOpen = signal(false);
  editing = signal<Category | null>(null);
  deleteTarget = signal<Category | null>(null);

  form = this.blank();

  blank() {
    return { name: '', description: '', image: '', sortOrder: 0 };
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.get<{ success: boolean; categories: Category[] }>('/categories/all').subscribe({
      next: r => { this.categories.set(r.categories); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openAdd() { this.form = this.blank(); this.editing.set(null); this.modalOpen.set(true); }

  openEdit(c: Category) {
    this.form = { name: c.name, description: c.description, image: c.image, sortOrder: c.sortOrder };
    this.editing.set(c);
    this.modalOpen.set(true);
  }

  save() {
    if (!this.form.name.trim()) { this.toast.error('Category name is required.'); return; }
    this.saving.set(true);
    const req = this.editing()
      ? this.api.put<any>(`/categories/${this.editing()!._id}`, this.form)
      : this.api.post<any>('/categories', this.form);

    req.subscribe({
      next: r => {
        this.toast.success(r.message);
        this.modalOpen.set(false);
        this.saving.set(false);
        this.load();
      },
      error: (e: any) => { this.toast.error(e.message); this.saving.set(false); },
    });
  }

  toggle(c: Category) {
    this.api.patch<any>(`/categories/${c._id}/toggle`, {}).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.categories.update(cats => cats.map(x => x._id === c._id ? { ...x, isActive: r.isActive } : x));
      },
      error: (e: any) => this.toast.error(e.message),
    });
  }

  confirmDelete(c: Category) { this.deleteTarget.set(c); }

  doDelete() {
    if (!this.deleteTarget()) return;
    this.api.delete<any>(`/categories/${this.deleteTarget()!._id}`).subscribe({
      next: r => { this.toast.success(r.message); this.deleteTarget.set(null); this.load(); },
      error: (e: any) => { this.toast.error(e.message); this.deleteTarget.set(null); },
    });
  }

  closeDeleteModal() { this.deleteTarget.set(null); }

  closeModal() { this.modalOpen.set(false); this.editing.set(null); }
}
