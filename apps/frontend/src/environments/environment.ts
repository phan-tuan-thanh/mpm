/**
 * Environment configuration — development
 *
 * Cấu hình Authentik OAuth2 và API endpoints.
 * Trong production, các giá trị này sẽ được override bởi environment.prod.ts
 */
export const environment = {
  production: false,

  /** Base URL cho API backend */
  apiBaseUrl: '/api',

  /** Authentik OAuth2 configuration */
  authentik: {
    /** Authentik authorize endpoint */
    authorizeUrl: 'http://localhost:9000/application/o/authorize/',
    /** OAuth2 Client ID (public) — phải khớp AUTHENTIK_CLIENT_ID trong .env / Authentik provider */
    clientId: 'agile-pm-frontend',
    /** Redirect URI sau khi Authentik xác thực xong */
    redirectUri: 'http://localhost:4200/auth/callback',
    /** OAuth2 scopes */
    scopes: 'openid profile email',
  },
};
