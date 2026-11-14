/**
 * BoundaryAllowlist identifies external boundaries (Node.js built-in modules
 * and external third-party npm packages) based strictly on module-resolution
 * and package evidence.
 *
 * Rules:
 * - Built-in Node.js modules (fs, http, crypto, etc. and node:* prefix) are external boundaries.
 * - Bare package specifiers ('axios', '@aws-sdk/client-s3', 'lodash', 'pg') or paths containing
 *   'node_modules' are external boundaries.
 * - Internal project modules (relative paths starting with './' or '../', or project source paths)
 *   are NOT external boundaries, regardless of generic naming words like 'service', 'payment', 'client', 'db'.
 * - If module-resolution evidence is absent or uncertain, abstains (returns false).
 */
export class BoundaryAllowlist {
  private static readonly BUILTIN_MODULES = new Set([
    'assert',
    'assert/strict',
    'async_hooks',
    'buffer',
    'child_process',
    'cluster',
    'console',
    'constants',
    'crypto',
    'dgram',
    'diagnostics_channel',
    'dns',
    'dns/promises',
    'domain',
    'events',
    'fs',
    'fs/promises',
    'http',
    'http2',
    'https',
    'inspector',
    'inspector/promises',
    'module',
    'net',
    'os',
    'path',
    'path/posix',
    'path/win32',
    'perf_hooks',
    'process',
    'punycode',
    'querystring',
    'readline',
    'readline/promises',
    'repl',
    'stream',
    'stream/consumers',
    'stream/promises',
    'stream/web',
    'string_decoder',
    'timers',
    'timers/promises',
    'tls',
    'trace_events',
    'tty',
    'url',
    'util',
    'util/types',
    'v8',
    'vm',
    'wasi',
    'worker_threads',
    'zlib',
  ]);

  /**
   * Returns true if moduleSpecifierOrPath clearly resolves to an external boundary
   * (Node.js built-in module or third-party npm dependency).
   *
   * Returns false for internal project modules and abstains (returns false) if uncertain.
   */
  static isExternalBoundary(moduleSpecifierOrPath?: string): boolean {
    if (!moduleSpecifierOrPath) {
      return false; // Abstain when no resolution evidence is available
    }

    const trimmed = moduleSpecifierOrPath.trim().replace(/\\/g, '/');
    if (!trimmed) {
      return false;
    }

    // 1. Explicit internal relative or local paths
    // e.g. './payment-service', '../src/order-service', 'src/payment-service.ts'
    if (
      trimmed.startsWith('./') ||
      trimmed.startsWith('../') ||
      trimmed.startsWith('/') ||
      /^[a-zA-Z]:\//.test(trimmed) ||
      trimmed.endsWith('.ts') ||
      trimmed.endsWith('.js')
    ) {
      // Local file paths inside node_modules are external dependencies
      if (trimmed.includes('/node_modules/') || trimmed.startsWith('node_modules/')) {
        return true;
      }
      return false; // Confirmed internal module
    }

    // 2. Node.js built-in modules
    if (trimmed.startsWith('node:')) {
      const stripped = trimmed.slice(5);
      return this.BUILTIN_MODULES.has(stripped) || this.BUILTIN_MODULES.has(stripped.split('/')[0]);
    }
    const rootSpecifier = trimmed.split('/')[0];
    if (this.BUILTIN_MODULES.has(trimmed) || this.BUILTIN_MODULES.has(rootSpecifier)) {
      return true;
    }

    // 3. Third-party package specifiers (scoped or unscoped npm packages)
    // e.g. 'axios', 'express', '@aws-sdk/client-s3', 'pg', 'ioredis'
    if (/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(\/.*)?$/i.test(trimmed)) {
      return true;
    }

    // 4. Abstain on unknown / uncertain syntax
    return false;
  }
}
