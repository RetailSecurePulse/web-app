import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer: 'http://localhost:30081/auth', // Update with your authorization server URL
  redirectUri: window.location.origin,
  clientId: 'client',
  responseType: 'code',
  scope: 'openid',
  useSilentRefresh: true,
  useHttpBasicAuth: false,
  disablePKCE: false,
  showDebugInformation: true
};

export const apiConfig = {
  user_api_url: 'http://localhost:30082/',
  business_entity_api_url: 'http://localhost:30083/',
  inventory_api_url: 'http://localhost:30084/',
  sales_api_url: 'http://localhost:30085/',
  report_api_url: 'http://localhost:30086/',
  payments_api_url: 'http://localhost:30087/'
};

export const environment = {
  production: false,
  authEnabled: true,
  useRuntimeConfig: true,
  devModeUser: 'superadmin',
  devModeRole: 'ADMIN', //'OPERATOR', //
  defaultPassword: 'password1',
  stripePublicKey: 'pk_test_51Rwa9JCTUDg2faMiUxYG28Di0rDMjD4C5xEPCkn0nv6bPc1Qy8WvivfAhhykVxGlAqfeF2tvILpEd0K9je6WPhLo00bfZAazGS'
};
