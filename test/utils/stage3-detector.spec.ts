import { isStage3Context } from '../../src/utils/stage3-detector.util';

describe('isStage3Context', () => {
  it('returns true for object with kind property', () => {
    expect(isStage3Context({ kind: 'class', name: 'MyClass' })).toBe(true);
  });
  it('returns true for field context', () => {
    expect(isStage3Context({ kind: 'field', name: 'myProp' })).toBe(true);
  });
  it('returns false for null', () => {
    expect(isStage3Context(null)).toBe(false);
  });
  it('returns false for undefined', () => {
    expect(isStage3Context(undefined)).toBe(false);
  });
  it('returns false for string (legacy propertyKey)', () => {
    expect(isStage3Context('myProperty')).toBe(false);
  });
  it('returns false for number (legacy parameter index)', () => {
    expect(isStage3Context(0)).toBe(false);
  });
  it('returns false for object without kind', () => {
    expect(isStage3Context({ name: 'MyClass' })).toBe(false);
  });
  it('returns false for function (legacy class decorator target)', () => {
    expect(isStage3Context(class MyClass {})).toBe(false);
  });
});
