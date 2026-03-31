import {inject} from '@angular/core';
import {HttpInterceptorFn} from '@angular/common/http';
import { AuthFacade } from '../services/auth.facade';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('Processing authInterceptor...');

  const patterns = [
    '/.well-known/openid-configuration',
    '/oauth2/jwks',
    '/oauth2/token',
    '/login'
  ];

  // Inject the OauthAuthenticationService
  const authService = inject(AuthFacade);

  // Get the token from the OauthAuthenticationService
  const token = authService.getAccessToken();

  // Skip the interceptor for OPTIONS requests (Preflight request)
  if (req.method === 'OPTIONS') {
    console.log('Method is OPTIONS, skipping authInterceptor...');
    return next(req); // Simply pass the OPTIONS request without modification
  }

  // Exclude the URL of the openid-configuration endpoint
  const matches = patterns.some(pattern => req.url.includes(pattern));
  if (matches) {
    console.log('Pattern matched, skipping authInterceptor...');
    return next(req); // Skip adding the Authorization header for this request
  }

  // Clone the request and add the authorization header if the token exists
  if (token) {
    console.log('Token found, append token');
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  else{
    console.log('No token found');
  }

  console.log('Request after authInterceptor:', req);

  // Pass the request to the next handler
  return next(req);
};
