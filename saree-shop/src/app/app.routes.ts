import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard, userOnlyGuard } from './guards/auth.guard';

export const routes: Routes = [
  // ── Public ──────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'products',
    loadComponent: () => import('./components/products/products.component').then(m => m.ProductsComponent)
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./components/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./components/cart/cart.component').then(m => m.CartComponent)
  },

  // ── Guest only (redirect if already logged in) ────────────────
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent),
    canActivate: [guestGuard]
  },

  // ── User only (admin blocked — has own admin panel) ──────────
  {
    path: 'checkout',
    loadComponent: () => import('./components/checkout/checkout.component').then(m => m.CheckoutComponent),
    canActivate: [userOnlyGuard]
  },
  {
    path: 'account',
    loadComponent: () => import('./components/account/account.component').then(m => m.AccountComponent),
    canActivate: [userOnlyGuard]
  },
  {
    path: 'orders',
    loadComponent: () => import('./components/my-orders/my-orders.component').then(m => m.MyOrdersComponent),
    canActivate: [userOnlyGuard]
  },

  // ── Admin panel ───────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./components/admin/orders/admin-orders.component').then(m => m.AdminOrdersComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./components/admin/products-mgmt/admin-products.component').then(m => m.AdminProductsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./components/admin/users/admin-users.component').then(m => m.AdminUsersComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./components/admin/categories/admin-categories.component').then(m => m.AdminCategoriesComponent)
      },
      {
        path: 'homepage',
        loadComponent: () => import('./components/admin/homepage-builder/homepage-builder.component').then(m => m.HomepageBuilderComponent)
      },
    ]
  },

  { path: '**', redirectTo: '' }
];
