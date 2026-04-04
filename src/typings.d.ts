interface RuntimeConfig {
  authConfig: AuthConfig;
  apiConfig: {
    user_api_url: string;
    business_entity_api_url: string;
    inventory_api_url: string;
    sales_api_url: string;
    report_api_url: string;
  };
  environment: {
    authEnabled: boolean;
    devModeUser: string;
    devModeRole: string;
    defaultPassword: string;
    stripePublicKey: string;
  };
}

interface Window {
  runtimeConfig?: RuntimeConfig;
}