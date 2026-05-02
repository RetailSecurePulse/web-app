import {inject} from '@angular/core';
import {HttpErrorResponse, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import { from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthFacade } from '../services/auth.facade';
import { ConfigService } from '../services/config.service';

const withBearerToken = (request: HttpRequest<unknown>, token: string): HttpRequest<unknown> => {
  if (!token) {
    return request;
  }

  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const excludedPaths = [
    '/.well-known/openid-configuration',
    '/oauth2/jwks',
    '/oauth2/token',
    '/login'
  ];

  const authService = inject(AuthFacade);
  const configService = inject(ConfigService);
  const protectedOrigins = Object.values(configService.apiConfig)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map(value => value.replace(/\/+$/, ''));

  if (req.method === 'OPTIONS') {
    return next(req);
  }

  const isExcludedPath = excludedPaths.some(pattern => req.url.includes(pattern));
  const isProtectedApiRequest = protectedOrigins.some(prefix => req.url.startsWith(prefix));
  if (isExcludedPath || !isProtectedApiRequest) {
    return next(req);
  }

  return from(authService.getAuthorizationToken()).pipe(
    switchMap((token) => next(withBearerToken(req, token))),
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return from(authService.getAuthorizationToken(true)).pipe(
        switchMap((token) => next(withBearerToken(req, token))),
        catchError((refreshError) => throwError(() => refreshError))
      );
    })
  );
};
