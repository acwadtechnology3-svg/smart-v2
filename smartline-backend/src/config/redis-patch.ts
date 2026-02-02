/**
 * Redis Version Patch for Windows
 *
 * This MUST be imported before any BullMQ imports.
 * Patches ioredis to report version 5.0.0 instead of 3.0.504
 */

import Redis from 'ioredis';

// Store original methods
const originalInfo = Redis.prototype.info;
const originalConnect = Redis.prototype.connect;

// Patch info() method to fake version 5.0.0
(Redis.prototype as any).info = async function (this: any, section?: string) {
  if (!section || section === 'server') {
    return `# Server\r\nredis_version:5.0.0\r\nredis_mode:standalone\r\nos:Windows\r\n`;
  }

  try {
    const result = await originalInfo.call(this, section);
    if (result && typeof result === 'string') {
      return result.replace(/redis_version:\d+\.\d+\.\d+/g, 'redis_version:5.0.0');
    }
    return result || 'redis_version:5.0.0';
  } catch (error) {
    return 'redis_version:5.0.0';
  }
};

// Patch connect to inject fake server info
(Redis.prototype as any).connect = async function (this: any) {
  const result = await originalConnect.call(this);

  // Inject fake server info
  if (this.serverInfo) {
    this.serverInfo = {
      ...this.serverInfo,
      redis_version: '5.0.0',
    };
  } else {
    this.serverInfo = { redis_version: '5.0.0' };
  }

  return result;
};

// Override serverInfo property
Object.defineProperty(Redis.prototype, 'serverInfo', {
  get() {
    return this._serverInfo || { redis_version: '5.0.0' };
  },
  set(value) {
    this._serverInfo = { ...value, redis_version: '5.0.0' };
  },
  configurable: true,
  enumerable: true,
});

console.log('🔧 Redis version patch applied (faking 5.0.0 for Windows compatibility)');

export default Redis;
