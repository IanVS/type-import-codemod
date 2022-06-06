import { applyTransform } from '@codeshift/test-utils';
import prettier from 'prettier';
import { describe, it, expect } from 'vitest';
import transformer from './transform';

function format(source: string): string {
  return prettier
    .format(source, {
      parser: 'babel-ts',
    })
    .trim();
}

describe('combine-type-and-value-imports-codemod', () => {
  it('should combine type imports with named imports', () => {
    const result = applyTransform(
      transformer,
      format(`
        import {value} from './source';
        import type {MyType} from './source';
    `),
      { parser: 'ts' }
    );
    expect(result).toEqual(
      format(`
       import {value, type MyType} from './source';
    `)
    );
  });

  it('should place value import first', () => {
    const result = applyTransform(
      transformer,
      format(`
        import type {MyType} from './source';
        import {value} from './source';
    `),
      { parser: 'ts' }
    );
    expect(result).toEqual(
      format(`
        import {value, type MyType} from './source';
    `)
    );
  });

  it('should combine type import and default import', () => {
    const result = applyTransform(
      transformer,
      format(`
        import type {MyType} from './source';
        import defaultValue from './source';
    `),
      { parser: 'ts' }
    );
    expect(result).toEqual(
      format(`
        import defaultValue, {type MyType} from './source';
    `)
    );
  });

  it('should not combine type import and namespace import', () => {
    const result = applyTransform(
      transformer,
      format(`
        import type {MyType} from './source';
        import * as Namespace from './source';
    `),
      { parser: 'ts' }
    );
    expect(result).toEqual(
      format(`
        import type {MyType} from './source';
        import * as Namespace from './source';
    `)
    );
  });

  it('should support aliased named imports', () => {
    const result = applyTransform(
      transformer,
      format(`
        import type {MyType} from './source';
        import {value as alias} from './source';
    `),
      { parser: 'ts' }
    );
    expect(result).toEqual(
      format(`
      import {value as alias, type MyType} from './source';
    `)
    );
  });

  it('should combine multiple imports from the same source', () => {
    const result = applyTransform(
      transformer,
      format(`
        import type {MyType, SecondType} from './source';
        import {value, SecondValue} from './source';
    `),
      { parser: 'ts' }
    );
    expect(result).toEqual(
      format(`
        import {value, SecondValue, type MyType, type SecondType} from './source';
    `)
    );
  });

  it('should combine multiple groups of imports', () => {
    const result = applyTransform(
      transformer,
      format(`
        import type {MyType} from './source';
        import type {OtherType} from './other';
        import {value} from './source';
        import {otherValue} from './other';
    `),
      { parser: 'ts' }
    );
    expect(result).toEqual(
      format(`
        import {value, type MyType} from './source';
        import {otherValue, type OtherType} from './other';
    `)
    );
  });

  it('should combine multiple imports statements from the same source', () => {
    const result = applyTransform(
      transformer,
      format(`
        import type {MyType} from './source';
        import type {SecondType} from './source';
        import {value} from './source';
        import {SecondValue} from './source';
    `),
      { parser: 'ts' }
    );
    // TODO: ideally we'd combine these two as well, but this is an edge case, and the
    // actual result here is not broken code.
    expect(result).toEqual(
      format(`
        import {value, type MyType, type SecondType} from './source';
        import {SecondValue} from './source';
    `)
    );
  });

  it('should not impact imports from different sources', () => {
    const result = applyTransform(
      transformer,
      format(`
        import type {MyType} from './source';
        import type {OtherType} from './other';
        import {thirdValue} from './third'
        import {value} from './source';
    `),
      { parser: 'ts' }
    );
    expect(result).toEqual(
      format(`
        import type {OtherType} from './other';
        import {thirdValue} from './third'
        import {value, type MyType} from './source';
    `)
    );
  });
});
