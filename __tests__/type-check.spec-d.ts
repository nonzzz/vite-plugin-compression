import { expectTypeOf, test } from 'vitest'
import { defineCompressionOption } from '../src'
import type { Algorithm, ViteCompressionPluginConfig } from '../src'

test('defineCompressionOption', () => {
  expectTypeOf(defineCompressionOption).toBeFunction()
  expectTypeOf(defineCompressionOption).parameter(0).toMatchTypeOf<ViteCompressionPluginConfig<unknown, Algorithm>>()
})
