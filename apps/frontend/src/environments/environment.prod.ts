/**
 * Environment configuration — production
 *
 * Các giá trị placeholder sẽ được thay thế bởi CI/CD pipeline
 * hoặc Docker environment variables khi deploy.
 */
export const environment = {
  production: true,

  /** Base URL cho API backend (production domain) */
  apiBaseUrl: '/api',

  /** Authentik OAuth2 configuration */
  authentik: {
    /** Authentik authorize endpoint — thay thế bằng production Authentik URL */
    authorizeUrl: 'https://auth.example.com/application/o/authorize/',
    /** OAuth2 Client ID (public) */
    clientId: 'agile-pm-frontend',
    /** Redirect URI sau khi Authentik xác thực xong */
    redirectUri: 'https://app.example.com/auth/callback',
    /** OAuth2 scopes */
    scopes: 'openid profile email',
  },
};
