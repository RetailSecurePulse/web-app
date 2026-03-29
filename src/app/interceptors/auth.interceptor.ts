import {inject} from '@angular/core';
import {HttpInterceptorFn} from '@angular/common/http';
import { AuthFacade } from '../services/auth.facade';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const patterns = [
    '/.well-known/openid-configuration',
    '/oauth2/jwks',
    '/oauth2/token',
    '/login'
  ];

  const authService = inject(AuthFacade);
  const token = authService.getAccessToken();

  if (req.method === 'OPTIONS') {
    return next(req);
  }

  const matches = patterns.some(pattern => req.url.includes(pattern));
  if (matches) {
    return next(req);
  }

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
