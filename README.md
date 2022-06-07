# type-import-codemod

Combines your type and value imports together into a single statement, using [Typescript 4.5's type modifier syntax](https://devblogs.microsoft.com/typescript/announcing-typescript-4-5/#type-on-import-names). It will also find type imports which have not been marked as types to be converted into explicit type imports

Before:

```ts
import React, { useState } from 'react';
import type { ComponentProps } from 'react';
import { AnotherType } from './types';
```

After:

```ts
import React, { useState, type ComponentProps } from 'react';
import { type AnotherType } from './types';
```

Note, the type import from react was placed at the end of the value imports, and the import from './types' was not changed.

## Installation

```bash
npm install type-import-codemod
```

## Usage

This is a CLI that wraps a [ts-morph](https://github.com/dsherret/ts-morph/tree/latest/packages/ts-morph) transform. One or more globs and/or file paths are required, to specify which files to run against. You should also provide a path to your tsconfig.json if it is not located at your project root or is named something other than tsconfig.json.

For example:

```shell
npx type-import-codemod --project="./custom-tsconfig.json" src/**/*.ts
```

This will run the transform on all files ending in `.tsx` in the `./src` directory, using the correct parser.

**Note**: Be sure to commit changes to your files before running this tool, as it can potentially cause a lot of changes. If in doubt, use the `--dry-run` flag to see what effect the transform will have, before it makes changes to your files.
