import { ConfigService } from './config.service';
import { environment } from '../../environments/environment';

describe('ConfigService', () => {
  let originalRuntimeConfig: Window['runtimeConfig'];

  beforeEach(() => {
    originalRuntimeConfig = window.runtimeConfig;
  });

  afterEach(() => {
    if (originalRuntimeConfig === undefined) {
      delete window.runtimeConfig;
      return;
    }

    window.runtimeConfig = originalRuntimeConfig;
  });

  it('should apply runtime environment overrides for local auth bypass settings', () => {
    window.runtimeConfig = {
      authConfig: {} as any,
      apiConfig: {} as any,
      environment: {
        production: true,
        authEnabled: false,
        devModeUser: 'localdev',
        devModeRole: 'operator',
        stripePublicKey: 'pk_runtime'
      }
    };

    const service = new ConfigService();

    expect(service.environment.production).toBe(environment.production);
    expect(service.environment.authEnabled).toBeFalse();
    expect(service.environment.devModeUser).toBe('localdev');
    expect(service.environment.devModeRole).toBe('operator');
    expect(service.environment.stripePublicKey).toBe('pk_runtime');
  });

  it('should fall back to environment values when runtime environment overrides are absent', () => {
    window.runtimeConfig = {
      authConfig: {} as any,
      apiConfig: {} as any,
      environment: undefined as any
    };

    const service = new ConfigService();

    expect(service.environment).toEqual({
      production: environment.production,
      authEnabled: environment.authEnabled,
      devModeUser: environment.devModeUser,
      devModeRole: environment.devModeRole,
      stripePublicKey: environment.stripePublicKey
    });
  });

  it('should reject production runtime config that enables OAuth debug logging', () => {
    window.runtimeConfig = {
      authConfig: {
        showDebugInformation: true
      } as any,
      apiConfig: {
        user_api_url: 'https://retailpulse.me:8082/',
        business_entity_api_url: 'https://retailpulse.me:8083/',
        inventory_api_url: 'https://retailpulse.me:8084/',
        sales_api_url: 'https://retailpulse.me:8085/',
        report_api_url: 'https://retailpulse.me:8086/',
        payments_api_url: 'https://retailpulse.me:8087/'
      } as any,
      environment: undefined as any
    };

    const originalProduction = environment.production;
    (environment as { production: boolean }).production = true;

    try {
      expect(() => new ConfigService()).toThrowError(
        'Insecure production configuration: OAuth debug logging must be disabled.'
      );
    } finally {
      (environment as { production: boolean }).production = originalProduction;
    }
  });
});
