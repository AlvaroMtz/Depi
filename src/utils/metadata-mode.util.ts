const LEGACY_METADATA_MISSING_MESSAGE =
  'reflect-metadata is required for legacy decorator mode. Install it via: npm install reflect-metadata';

type LegacyMetadataReader = (metadataKey: string, target: Object, propertyKey?: string | Symbol) => unknown;

function readLegacyMetadata(metadataKey: string, target: Object, propertyKey?: string | Symbol): unknown {
  return ((Reflect as any).getMetadata as LegacyMetadataReader)(metadataKey, target, propertyKey);
}

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

/**
 * Reads metadata through reflect-metadata and throws if legacy metadata APIs are unavailable.
 */
export function getRequiredLegacyMetadata(metadataKey: string, target: Object, propertyKey?: string | Symbol): unknown {
  requireLegacyMetadata();
  return readLegacyMetadata(metadataKey, target, propertyKey);
}

/**
 * Reads metadata through reflect-metadata when available and otherwise returns undefined.
 */
export function getLegacyMetadataIfAvailable(
  metadataKey: string,
  target: Object,
  propertyKey?: string | Symbol
): unknown {
  if (!isLegacyMetadataAvailable()) {
    return undefined;
  }

  return readLegacyMetadata(metadataKey, target, propertyKey);
}

export { LEGACY_METADATA_MISSING_MESSAGE };
