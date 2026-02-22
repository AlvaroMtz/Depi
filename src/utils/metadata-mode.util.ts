const LEGACY_METADATA_MISSING_MESSAGE =
  'reflect-metadata is required for legacy decorator mode. Install it via: npm install reflect-metadata';

/**
 * Returns true when legacy reflect-metadata APIs are available.
 */
export function isLegacyMetadataAvailable(): boolean {
  return typeof Reflect !== 'undefined' && typeof (Reflect as any).getMetadata === 'function';
}

/**
 * Ensures legacy metadata APIs are present.
 * Throws a guided error message when missing.
 */
export function requireLegacyMetadata(message: string = LEGACY_METADATA_MISSING_MESSAGE): void {
  if (!isLegacyMetadataAvailable()) {
    throw new TypeError(message);
  }
}

export { LEGACY_METADATA_MISSING_MESSAGE };
