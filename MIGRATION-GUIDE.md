# Migration Guide

## From v1.x to v2.x

### Breaking Changes

#### 1. `algorithm` → `algorithms` (Array Support)

- **Old**: Single algorithm with `algorithm` option
- **New**: Multiple algorithms with `algorithms` array

#### 2. Removed `compressionOptions`

- **Old**: Separate `compressionOptions` object
- **New**: Use `defineAlgorithm()` helper function

#### 3. Enhanced Algorithm Definition

- **New**: Support for custom algorithm functions
- **New**: Better type safety with `defineAlgorithm()`

### Migration Examples

#### Basic Algorithm Configuration

**Before (v1.x)**

```js
import { compression } from 'vite-plugin-compression2'

compression({
  algorithm: 'gzip',
  compressionOptions: { level: 9 }
})
```

**After (v2.x)**

```js
import { compression, defineAlgorithm } from 'vite-plugin-compression2'

compression({
  algorithms: [defineAlgorithm('gzip', { level: 9 })]
})
```

#### Multiple Algorithms

**Before (v1.x)**

```js
// Required multiple plugin instances
compression({ algorithm: 'gzip' }), compression({ algorithm: 'brotliCompress' })
```

**After (v2.x)**

```js
import { compression, defineAlgorithm } from 'vite-plugin-compression2'

compression({
  algorithms: [
    defineAlgorithm('gzip', { level: 9 }),
    defineAlgorithm('brotliCompress', {
      params: {
        [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11
      }
    })
  ]
})
```

#### Mixed Algorithm Types

**New in v2.x** - Support for custom algorithm functions:

```js
import { compression, defineAlgorithm } from 'vite-plugin-compression2'

compression({
  algorithms: [
    // Built-in algorithm
    'gzip',

    // Built-in algorithm with options
    defineAlgorithm('brotliCompress', {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 8 }
    }),

    // Custom algorithm function
    defineAlgorithm(
      async (buffer, options) => {
        // Your custom compression logic
        return compressedBuffer
      },
      { customOption: true }
    )
  ]
})
```

### Step-by-Step Migration

#### Step 1: Update Package

```bash
npm install vite-plugin-compression2@latest -D
```

#### Step 2: Update Import

```js
// Old
import { compression } from 'vite-plugin-compression2'

// New
import { compression, defineAlgorithm } from 'vite-plugin-compression2'
```

#### Step 3: Update Configuration

**Simple case:**

```js
// Old
compression({
  algorithm: 'gzip'
})

// New
compression({
  algorithms: ['gzip'] // or [defineAlgorithm('gzip')]
})
```

**With options:**

```js
// Old
compression({
  algorithm: 'gzip',
  compressionOptions: { level: 6 }
})

// New
compression({
  algorithms: [defineAlgorithm('gzip', { level: 6 })]
})
```

#### Step 4: Update Multiple Instances

```js
// Old - Multiple plugin instances
export default defineConfig({
  plugins: [
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress' })
  ]
})

// New - Single plugin instance
export default defineConfig({
  plugins: [
    compression({
      algorithms: ['gzip', 'brotliCompress']
    })
  ]
})
```

### New Features in v2.x

#### 1. Simplified Array Syntax

```js
compression({
  algorithms: ['gzip', 'brotliCompress'] // Auto-uses default options
})
```

#### 2. Enhanced Type Safety

```js
// TypeScript will infer correct option types
const gzipAlg = defineAlgorithm('gzip', { level: 9 }) // ZlibOptions
const brotliAlg = defineAlgorithm('brotliCompress', {
  params: {/* BrotliOptions */}
})
```

#### 3. Custom Algorithm Support

```js
const customAlgorithm = defineAlgorithm(
  async (buffer: Buffer, options: { quality: number }) => {
    // Custom compression implementation
    return compressedBuffer;
  },
  { quality: 8 }
);
```

### Compatibility Notes

#### Unchanged Options

These options work the same way in v2.x:

- ✅ `include`
- ✅ `exclude`
- ✅ `threshold`
- ✅ `filename`
- ✅ `deleteOriginalAssets`
- ✅ `skipIfLargerOrEqual`

#### Filename Patterns

Filename patterns remain the same:

```js
compression({
  filename: '[path][base].gz', // Still works
  algorithms: ['gzip']
})
```

### Common Migration Patterns

#### Pattern 1: Default Gzip

```js
// v1.x
compression()

// v2.x
compression() // Still works! Defaults to ['gzip', 'brotliCompress']
```

#### Pattern 2: Custom Gzip Level

```js
// v1.x
compression({
  algorithm: 'gzip',
  compressionOptions: { level: 6 }
})

// v2.x
compression({
  algorithms: [defineAlgorithm('gzip', { level: 6 })]
})
```

#### Pattern 3: Brotli Compression

```js
// v1.x
compression({
  algorithm: 'brotliCompress',
  compressionOptions: {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11
    }
  }
})

// v2.x
compression({
  algorithms: [defineAlgorithm('brotliCompress', {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11
    }
  })]
})
```

### Troubleshooting

#### Issue: TypeScript Errors

**Solution**: Make sure to import `defineAlgorithm`:

```js
import { compression, defineAlgorithm } from 'vite-plugin-compression2'
```

#### Issue: Options Not Applied

**Solution**: Use `defineAlgorithm()` for custom options:

```js
// Wrong
algorithms: ;['gzip']

// Correct with options
algorithms: ;[defineAlgorithm('gzip', { level: 9 })]
```

#### Issue: Multiple Plugin Instances

**Solution**: Combine into single instance:

```js
// Old approach
compression({ algorithm: 'gzip' }), compression({ algorithm: 'brotliCompress' })

// New approach
compression({
  algorithms: ['gzip', 'brotliCompress']
})
```

### Need Help?

- 📖 Check the [Q&A Guide](./Q&A.md)
- 🐛 Report issues on [GitHub Issues](https://github.com/nonzzz/vite-plugin-compression2/issues)
- 💡 See more examples in the [README](./README.md)
