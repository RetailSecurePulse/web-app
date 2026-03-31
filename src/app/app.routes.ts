import {Routes} from '@angular/router';
import {LoginPageComponent} from './login-page/login-page.component';
import {authGuard} from './guards/auth.guard';
import { AuthCallbackComponent } from './auth-callback/auth-callback.component';

// Lazy-loaded components
const lazyAdminPage = () => import('./admin-page/admin-page.component').then(mod => mod.AdminPageComponent);
const lazyOperatorPage = () => import('./operator-page/operator-page.component').then(mod => mod.OperatorPageComponent);
const lazyProductManagement = () => import('./product-management/product-management.component').then(mod => mod.ProductManagementComponent);
const lazyUserManagement = () => import('./user-management/user-management.component').then(mod => mod.UserManagementComponent);
const lazyBusinessEntityManagement = () => import('./business-entity-management/business-entity-management.component').then(mod => mod.BusinessEntityManagementComponent);
const lazyProfile = () => import('./profile/profile.component').then(mod => mod.ProfileComponent);
const lazyReportGeneration = () => import('./report-generation/report-generation.component').then(mod => mod.ReportGenerationComponent);
const lazyInvenotryManagement = () => import ('./inventory-management/inventory-management.component').then(mod => mod.InventoryManagementComponent);
const lazyPOS = () => import('./pos-system/pos-system.component').then(mod => mod.PosComponent);

export const routes: Routes = [
  {path: 'auth/callback', component: AuthCallbackComponent},
  // Login route
  {path: '', component: LoginPageComponent},
  {path: 'login', component: LoginPageComponent},

  // Admin routes with guard and role-based access
  {
    path: 'admin',
    loadComponent: lazyAdminPage,
    canActivate: [authGuard],
    data: {roles: ['ADMIN']},
    children: [
      {path: 'product-management', loadComponent: lazyProductManagement},
      {path: 'user-management', loadComponent: lazyUserManagement},
      {path: 'inventory-management', loadComponent: lazyInvenotryManagement},
      {path: 'business-entity-management', loadComponent: lazyBusinessEntityManagement},
      {path: 'report-generation', loadComponent: lazyReportGeneration},
      {path: 'profile', loadComponent: lazyProfile},
      {path: 'pos-system', loadComponent: lazyPOS},
      {path: '', redirectTo: 'profile', pathMatch: 'full' }, // Default childroute
    ],
  },

  // Operator route with guard and role-based access
  {
    path: 'manager',
    loadComponent: lazyOperatorPage,
    canActivate: [authGuard],
    data: {roles: ['MANAGER']},
    children: [
      {path: 'product-management', loadComponent: lazyProductManagement},
      {path: 'inventory-management', loadComponent: lazyInvenotryManagement},
      {path: 'business-entity-management', loadComponent: lazyBusinessEntityManagement},
      {path: 'report-generation', loadComponent: lazyReportGeneration},
      {path: 'profile', loadComponent: lazyProfile},
      {path: 'pos-system', loadComponent: lazyPOS},
      {path: '', redirectTo: 'profile', pathMatch: 'full' }, // Default childroute
    ],
  },
  {
    path: 'inventory-manager',
    loadComponent: lazyOperatorPage,
    canActivate: [authGuard],
    data: {roles: ['INVENTORY_MANAGER']},
    children: [
      {path: 'inventory-management', loadComponent: lazyInvenotryManagement},
      {path: 'report-generation', loadComponent: lazyReportGeneration},
      {path: 'profile', loadComponent: lazyProfile},
      {path: '', redirectTo: 'profile', pathMatch: 'full' }, // Default childroute
    ],
  },
  {
    path: 'cashier',
    loadComponent: lazyOperatorPage,
    canActivate: [authGuard],
    data: {roles: ['CASHIER']},
    children: [
      {path: 'pos-system', loadComponent: lazyPOS},
      {path: 'profile', loadComponent: lazyProfile},
      {path: '', redirectTo: 'profile', pathMatch: 'full' }, // Default childroute
    ],
  },
  // Wildcard route redirects to login
  {path: '**', redirectTo: '/login'},
];
