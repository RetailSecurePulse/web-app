import { InjectionToken } from "@angular/core";
import { apiConfig, environment } from '../../environments/environment';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
    providedIn: 'root',
    factory: () => apiConfig.payment_api_url
});

export const STRIPE_PUBLIC_KEY = new InjectionToken<string>('STRIPE_PUBLIC_KEY', {
    providedIn: 'root',
    factory: () => environment.stripePublicKey
});