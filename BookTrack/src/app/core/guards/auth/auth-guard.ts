import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const roles = route.data?.['roles'];
  if (roles) {
    const userRole = authService.getUserRole();
    if (!userRole || !roles.includes(userRole)) {
      return router.createUrlTree(['/home']);
    }
  }

  return true;
};