import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer: 'https://retailpulse.me:8081', // Update with your authorization server URL
  requireHttps: true,
  redirectUri: `${globalThis.location.origin}/auth/callback`,
  postLogoutRedirectUri: `${globalThis.location.origin}`,
  clientId: 'client',
  responseType: 'code',
  scope: 'openid offline_access',
  useSilentRefresh: true,
  useHttpBasicAuth: false,
  disablePKCE: false,
  showDebugInformation: false
};

export const apiConfig = {  
  user_api_url: 'https://retailpulse.me:8082/',
  business_entity_api_url: 'https://retailpulse.me:8083/',
  inventory_api_url: 'https://retailpulse.me:8084/',
  sales_api_url: 'https://retailpulse.me:8085/',
  report_api_url: 'https://retailpulse.me:8086/',
  payments_api_url: 'https://retailpulse.me:8087/'
};

export const environment = {
  production: true,
  authEnabled: true,
  useRuntimeConfig: true,
  devModeUser: 'superadmin',
  devModeRole: 'ADMIN', //'OPERATOR', //
  stripePublicKey: 'pk_test_public_key_placeholder'
};
