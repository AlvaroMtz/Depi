import {
  getLegacyMetadataIfAvailable,
  getRequiredLegacyMetadata,
  isLegacyMetadataAvailable,
  LEGACY_METADATA_MISSING_MESSAGE,
  requireLegacyMetadata,
} from '../../src/utils/metadata-mode.util';

describe('metadata-mode util', () => {
  it('reports legacy metadata availability based on Reflect.getMetadata', () => {
    const originalGetMetadata = (Reflect as any).getMetadata;

    try {
      (Reflect as any).getMetadata = undefined;
      expect(isLegacyMetadataAvailable()).toBe(false);

      (Reflect as any).getMetadata = () => undefined;
      expect(isLegacyMetadataAvailable()).toBe(true);
    } finally {
      (Reflect as any).getMetadata = originalGetMetadata;
    }
  });

  it('throws a guided error by default when legacy metadata is missing', () => {
    const originalGetMetadata = (Reflect as any).getMetadata;

    try {
      (Reflect as any).getMetadata = undefined;

      expect(() => requireLegacyMetadata()).toThrow(LEGACY_METADATA_MISSING_MESSAGE);
    } finally {
      (Reflect as any).getMetadata = originalGetMetadata;
    }
  });

  it('accepts a custom error message', () => {
    const originalGetMetadata = (Reflect as any).getMetadata;

    try {
      (Reflect as any).getMetadata = undefined;

      expect(() => requireLegacyMetadata('custom message')).toThrow('custom message');
    } finally {
      (Reflect as any).getMetadata = originalGetMetadata;
    }
  });

  it('returns undefined from optional metadata reader when reflect API is unavailable', () => {
    const originalGetMetadata = (Reflect as any).getMetadata;

    try {
      (Reflect as any).getMetadata = undefined;

      expect(getLegacyMetadataIfAvailable('design:paramtypes', class TestClass {})).toBeUndefined();
    } finally {
      (Reflect as any).getMetadata = originalGetMetadata;
    }
  });

  it('reads metadata from required metadata reader when reflect API is available', () => {
    const originalGetMetadata = (Reflect as any).getMetadata;

    try {
      (Reflect as any).getMetadata = jest.fn(() => ['dependency']);

      expect(getRequiredLegacyMetadata('design:paramtypes', class TestClass {})).toEqual(['dependency']);
      expect((Reflect as any).getMetadata).toHaveBeenCalledWith('design:paramtypes', expect.any(Function), undefined);
    } finally {
      (Reflect as any).getMetadata = originalGetMetadata;
    }
  });
});
