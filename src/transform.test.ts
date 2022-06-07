import prettier from 'prettier';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import transformer, { Options } from './transform';

function format(source: string): string {
  return prettier
    .format(source, {
      parser: 'babel-ts',
    })
    .trim();
}

function formatLog(log: string[]) {
  return format(log.join('\n'));
}

const consoleSpy = vi.spyOn(console, 'log');

function buildOptions(filePath: string | string[], configOverrides: Partial<Options> = {}) {
  const baseOptions = {
    dryRun: true,
    tsconfigPath: './tsconfig.json',
  };
  const globs = Array.isArray(filePath) ? filePath : [filePath];
  return {
    ...baseOptions,
    configOverrides,
    globs,
  };
}

describe('combine-type-and-value-imports-codemod', () => {
  beforeEach(() => {
    consoleSpy.mockReset();
  });

  it('should combine type imports with named imports', () => {
    transformer(buildOptions('test/fixtures/type-and-value.ts'));
    const result = formatLog(consoleSpy.mock.calls[0]);
    expect(result).toMatchInlineSnapshot('"import { value, type Type } from \\"./mixed-exports\\";"');
  });

  it('should combine type import and default import', () => {
    transformer(buildOptions('test/fixtures/type-and-default.ts'));
    const result = formatLog(consoleSpy.mock.calls[0]);
    expect(result).toMatchInlineSnapshot('"import Default, { type Type } from \\"./mixed-exports\\";"');
  });

  it('should not combine type import and namespace import', () => {
    transformer(buildOptions('test/fixtures/type-and-namespace.ts'));
    const result = formatLog(consoleSpy.mock.calls[0]);
    expect(result).toMatchInlineSnapshot(`
      "import type { Type } from \\"./mixed-exports\\";
      import * as Namespace from \\"./mixed-exports\\";"
    `);
  });

  it('should support aliased named imports', () => {
    transformer(buildOptions('test/fixtures/aliased-type-and-value.ts'));
    const result = formatLog(consoleSpy.mock.calls[0]);
    expect(result).toMatchInlineSnapshot(`
      "import {
        value as aliasedValue,
        type Type as AliasedType,
      } from \\"./mixed-exports\\";"
    `);
  });

  it('should combine multiple imports from the same source', () => {
    transformer(buildOptions('test/fixtures/multiple-type-and-value.ts'));
    const result = formatLog(consoleSpy.mock.calls[0]);
    expect(result).toMatchInlineSnapshot(
      '"import Default, { value, type Type, type Interface } from \\"./mixed-exports\\";"'
    );
  });

  it('should combine multiple import declarations', () => {
    transformer(buildOptions('test/fixtures/multiple-imports.ts'));
    const result = formatLog(consoleSpy.mock.calls[0]);
    expect(result).toMatchInlineSnapshot(`
      "import { name, type Foo } from \\"./default-type-export\\";
      import { value, type Type } from \\"./mixed-exports\\";"
    `);
  });

  it('should combine multiple import declarations from the same source', () => {
    transformer(buildOptions('test/fixtures/multiple-import-declarations.ts'));
    const result = formatLog(consoleSpy.mock.calls[0]);
    expect(result).toMatchInlineSnapshot(
      '"import Default, { value, type Type, type Interface } from \\"./mixed-exports\\";"'
    );
  });

  it('should convert named imports into type imports when possible', () => {
    transformer(buildOptions('test/fixtures/implicit-named-types.ts'));
    const result = formatLog(consoleSpy.mock.calls[0]);
    expect(result).toMatchInlineSnapshot(
      '"import Default, { value, type Type, type Interface } from \\"./mixed-exports\\";"'
    );
  });

  it('should convert named imports into type imports and combine with other type imports', () => {
    transformer(buildOptions('test/fixtures/implicit-named-types-and-value.ts'));
    const result = formatLog(consoleSpy.mock.calls[0]);
    expect(result).toMatchInlineSnapshot(
      '"import Default, { value, type Type, type Interface } from \\"./mixed-exports\\";"'
    );
  });

  it('should keep default import if more than one from the same module', () => {
    transformer(buildOptions('test/fixtures/implicit-named-types-and-value-multiple-defaults.ts'));
    const result = formatLog(consoleSpy.mock.calls[0]);
    expect(result).toMatchInlineSnapshot(`
      "import Default1, { value, type Type } from \\"./mixed-exports\\";
      import Default2 from \\"./mixed-exports\\";"
    `);
  });
});
