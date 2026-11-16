import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Rol } from '../../../models/user.model';
import { catchError, map, of } from 'rxjs';

export const homeDeRol = (rol: string | null | undefined) =>
  rol === 'admin' ? '/admin-bibliotecarios' : rol === 'bibliotecario' ? '/home-bibliotecario' : '/home';

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
      const destino = (roles as Rol[]).find(rol => authService.getUserRoles().includes(rol));
      if (destino) {
        return authService.cambiarRol(destino).pipe(
          map(() => true),
          catchError(error => {
            if (error.status === 401) { authService.logout(); return of(router.createUrlTree(['/login'])); }
            return of(router.createUrlTree([homeDeRol(userRole)]));
          }),
        );
      }
      return router.createUrlTree([homeDeRol(userRole)]);
    }
  }

  return true;
};
