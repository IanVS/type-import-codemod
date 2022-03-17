# type-import-codemod

Combines your type and value imports together into a single statement, using [Typescript 4.5's type modifier syntax](https://devblogs.microsoft.com/typescript/announcing-typescript-4-5/#type-on-import-names).

Before:

```ts
import React, { useState } from 'react';
import type { ComponentProps } from 'react';
import type { AnotherType } from './types';
```

After:

```ts
import React, { useState, type ComponentProps } from 'react';
import type { AnotherType } from './types';
```

Note, the type import from react was placed at the end of the value imports, and the import from './types' was not changed. Type imports will not be modified, unless they can be combined into another import statement, as shown for the react imports.

## Installation

```bash
npm install type-import-codemod
```

## Usage

This is a [jscodeshift](https://www.npmjs.com/package/jscodeshift) transform, with a simple wrapper script to call jscodeshift for you. You should specify the file/directories to run the codemod on, as well as any other [jscodeshift arguments](https://github.com/facebook/jscodeshift#usage-cli) that you need. The only argument added by this package is the transform.

For example:

```shell
npx type-import-codemod src --extensions=tsx --parser=tsx
```

This will run the transform on all files ending in `.tsx` in the `./src` directory, using the correct parser.

**Note**: Be sure to commit changes to your files before running this tool, as it can potentially cause a lot of changes. If in doubt, use the `--dry` and `--print` flags to see what effect the transform will have, before it makes changes to your files.
