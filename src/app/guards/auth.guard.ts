import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { AuthFacade } from '../services/auth.facade';

@Injectable({
  providedIn: 'root'
})
export class authGuard implements CanActivate {
  constructor(private authFacade: AuthFacade, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.authFacade.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    const requiredRoles = route.data?.['roles'] as string[] | undefined;
    if (!requiredRoles?.length) {
      return true;
    }

    const userRoles = (this.authFacade.getUserRole() ?? [])
      .map((role) => role.toUpperCase());

    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.includes(role.toUpperCase())
    );

    if (hasRequiredRole) {
      return true;
    }

    this.authFacade.navigateToAuthenticatedUser();
    return false;
  }
}
