import { expect, test } from 'vitest'
import type { InputType } from 'zlib'
import { compress, ensureAlgorithm } from '../src/compress'
import type { Algorithm } from '../src/interface'

const mockCompress = async (userAlgorithm: Algorithm, buf: InputType) => {
  const { algorithm } = ensureAlgorithm(userAlgorithm)
  return compress(buf, algorithm, {})
}

test('compress with error', async () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  await expect(mockCompress('gzip', 123 as any)).rejects.toThrowError(
    'The "chunk" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received type number (123)'
  )
})
