import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrderService } from '../../../services/order.service';
import { ProductService } from '../../../services/product.service';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  orderService = inject(OrderService);
  ps = inject(ProductService);
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  today = new Date();
  stats = signal<any>(null);
  userStats = signal<any>(null);
  recentOrders = signal<any[]>([]);
  loadingOrders = signal(true);
  refreshing = signal(false);
  lastUpdated = signal<Date | null>(null);

  ngOnInit() {
    this.refreshDashboard(true);
    interval(30000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshDashboard(false));
  }

  formatRevenue(v?: number) {
    if (!v) return 'Rs 0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
  }

  refreshDashboard(showLoading = false) {
    if (showLoading) this.loadingOrders.set(true);
    this.refreshing.set(true);

    this.orderService.adminGetStats().subscribe({
      next: r => this.stats.set(r.stats),
    });

    this.api.get<any>('/users/stats').subscribe({
      next: r => this.userStats.set(r.stats),
    });

    this.orderService.adminGetAll({ limit: 8 }).subscribe({
      next: (r) => {
        this.recentOrders.set(r.orders);
        this.loadingOrders.set(false);
        this.refreshing.set(false);
        this.lastUpdated.set(new Date());
      },
      error: () => {
        this.loadingOrders.set(false);
        this.refreshing.set(false);
      },
    });
  }
}
