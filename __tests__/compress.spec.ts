import test from 'ava'
import { Buffer } from 'buffer'
import { ensureAlgorithmAndFormat, transfer } from '../src/compress'
import type { Algorithm } from '../src/interface'

const mockAlgorithm = (algorithm: Algorithm) => {
  return ensureAlgorithmAndFormat(algorithm)
}

const mockTransfer = async (userAlgorithm: Algorithm, buf: Buffer) => {
  const { algorithm } = await ensureAlgorithmAndFormat(userAlgorithm)
  return transfer(buf, algorithm, {})
}

test('algorithm', async (t) => {
  const { ext: gz } = await mockAlgorithm('gzip')
  t.is(gz, '.gz')
  const { ext: br } = await mockAlgorithm('brotliCompress')
  t.is(br, '.br')
  const { ext: de } = await mockAlgorithm('deflate')
  t.is(de, '')
  const msg = await t.throwsAsync(mockAlgorithm('' as Algorithm))
  t.is(msg.message, 'Invalid algorithm in "zlib"')
})

test('transer', async (t) => {
  const fake = Buffer.alloc(4, 'test')
  await mockTransfer('gzip', fake)
  t.pass()
})

test('transfer with error', async (t) => {
  const msg = await t.throwsAsync(mockTransfer('gzip', 123 as any))
  t.is(
    msg.message,
    'The "chunk" argument must be of type string or an instance of Buffer or Uint8Array. Received type number (123)'
  )
})
