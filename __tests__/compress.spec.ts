import { Buffer } from 'buffer'
import test from 'ava'
import { compress, ensureAlgorithm } from '../src/compress'
import type { Algorithm } from '../src/interface'

const mockCompress = async (userAlgorithm: Algorithm, buf: Buffer) => {
  const { algorithm } = ensureAlgorithm(userAlgorithm)
  return compress(buf, algorithm, {})
}

test('transer', async (t) => {
  const fake = Buffer.alloc(4, 'test')
  await mockCompress('gzip', fake)
  t.pass()
})

test('compress with error', async (t) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = await t.throwsAsync(mockCompress('gzip', 123 as any))
  t.is(
    msg.message,
    'The "chunk" argument must be of type string or an instance of Buffer or Uint8Array. Received type number (123)'
  )
})
