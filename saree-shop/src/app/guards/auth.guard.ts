import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Requires login. Admin is auto-redirected to /admin on login, but can still reach user pages if needed. */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

/** Requires admin role */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true;
  router.navigate(['/']);
  return false;
};

/** Blocks logged-in users (login/register pages) */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  // Admin goes to admin panel, users go home
  if (auth.isAdmin()) { router.navigate(['/admin']); return false; }
  router.navigate(['/']);
  return false;
};

/** User-only routes — blocks admins (they have their own admin panel) */
export const userOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) { router.navigate(['/login']); return false; }
  if (auth.isAdmin()) { router.navigate(['/admin']); return false; }
  return true;
};
