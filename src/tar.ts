// https://www.gnu.org/software/tar/manual/html_section/Formats.html
// Only need pack is enough. (ustar)
// No gnu or old gnu or v7 and oters etc.
// POSIX.1-1988
// https://www.gnu.org/software/tar/manual/tar.html#Blocking-Factor
import { len } from './utils'

export interface Header {
  name: Uint8Array[100]
  mode: Uint8Array[8]
  uid: Uint8Array[8]
  gid: Uint8Array[8]
  size: Uint8Array[12]
  mtime: Uint8Array[12]
  checksum: Uint8Array[8]
  typeflag: Uint8Array[1]
  linkname: Uint8Array[100]
  magic: Uint8Array[6]
  version: Uint8Array[2]
  uname: Uint8Array[32]
  gname: Uint8Array[32]
  devmajor: Uint8Array[8]
  devminor: Uint8Array[8]
  prefix: Uint8Array[155]
}

export type Overwrite<E, O> = {
  [P in keyof E]: P extends keyof O ? O[P] : E[P]
}

export const TypeFlag = {
  REG_TYPE: '0',
  AREG_TYPE: '\0',
  LINK_TYPE: '1',
  SYM_TYPE: '2',
  CHR_TYPE: '3',
  BLK_TYPE: '4',
  DIR_TYPE: '5',
  FIFO_TYPE: '6',
  CONT_TYPE: '7'
} as const

export type TypeFlag = typeof TypeFlag[keyof typeof TypeFlag]

export type Options = Partial<
  Overwrite<Header, {
    name: string
    mode: number
    uid: number
    gid: number
    typeflag: TypeFlag
    linkname: string
    uname: string
    gname: string
    devmajor: number
    devminor: number
    mtime: number
  }>
>

// Each record of n blocks (where n is set by the ‘--blocking-factor=512-size’ (‘-b 512-size’) option to tar)
export const HEAD_TABLE_SIZE = 512

export const MAX_FILE_NAME_SIZE = 255

export const ZERO_OFFSET = 0

export const T_MAGIC = 'ustar'

export const T_MAGLEN = 6

export const T_VERSION = '00'
export const T_VERSLEN = 2

// Bits used in the mode field, values in octal.
export const Mode = {
  TS_UID: 0o4000,
  TS_GID: 0o2000,
  TS_VTX: 0o1000,
  TU_READ: 0o0400,
  TU_WRITE: 0o0200,
  TU_EXEC: 0o0100,
  TG_READ: 0o0040,
  TG_WRITE: 0o0020,
  TG_EXEC: 0o0010,
  TO_READ: 0o0004,
  TO_WRITE: 0o0002,
  TO_EXEC: 0o0001
} as const

export const F_MODE = Mode.TU_READ | Mode.TU_WRITE | Mode.TG_READ | Mode.TO_READ

export const D_MODE = Mode.TU_READ | Mode.TU_WRITE | Mode.TU_EXEC | Mode.TG_READ | Mode.TG_EXEC | Mode.TO_READ |
  Mode.TO_EXEC

export type Mode = typeof Mode[keyof typeof Mode]

export const G_ID = 0

export const U_ID = 0

let _encoder: TextEncoder

let _decoder: TextDecoder

export const u8 = {
  encode: (str: string) => {
    if (!_encoder) {
      _encoder = new TextEncoder()
    }
    return _encoder.encode(str)
  },
  decode: (u8: Uint8Array) => {
    if (!_decoder) {
      _decoder = new TextDecoder()
    }
    return _decoder.decode(u8)
  }
}

export const octal = {
  encode: (u: number, fixed?: number) => {
    const o = u.toString(8)
    if (fixed) {
      if (len(o) <= fixed) {
        const fill = '0'.repeat(fixed - len(o))
        return fill + o + ' '
      }
      return '7'.repeat(fixed) + ' '
    }
    return o
  }
}
// https://www.gnu.org/software/tar/manual/html_section/create-options.html#override
// 1. File names can contain at most 255 bytes.
// 2. File names longer than 100 bytes must be split at a directory separator in two
// parts, the first being at most 155 bytes long. So, in most cases file names must be
// a bit shorter than 255 bytes.
// 3. Symbolic links can contain at most 100 bytes.
// 4. Files can contain at most 8 GiB (2^33 bytes = 8,589,934,592 bytes).
// 5. UIDs, GIDs, device major numbers, and device minor numbers must be less than 2^21 (2,097,152).

export class Head {
  private options: Options
  private block: Uint8Array
  constructor(opts: Options) {
    this.options = opts
    this.block = new Uint8Array(HEAD_TABLE_SIZE)
  }

  // Each block using 8 bit char in local variant of ASCII
  // The name, linkname, magic, uname, and gname are null-terminated character strings.
  // All other fields are zero-filled octal numbers in ASCII
  // Each numeric field of width w contains w minus 1 digits,
  encode() {
    let prefix = ''
    const { typeflag, linkname, mode, uid, gid, size, mtime, uname, gname, devmajor, devminor } = this.options
    let name = this.options.name
    if (typeflag === TypeFlag.DIR_TYPE && name[len(name) - 1] !== '/') {
      name += '/'
    }
    let binaryName = u8.encode(name)
    // Not utf8
    if (binaryName.length !== name.length) {
      return null
    }
    // find the file name and handle the prefix
    while (name.length > 100) {
      const spec = name.indexOf('/')
      if (spec === -1) return null
      const range = name.slice(0, spec)
      prefix += prefix ? '/' + range : range
      name = name.slice(spec + 1)
    }
    //  Fix name
    if (binaryName.length !== name.length) {
      binaryName = u8.encode(name)
    }
    if (binaryName.length + prefix.length > MAX_FILE_NAME_SIZE) {
      return null
    }
    if (linkname && u8.encode(linkname).length > 100) {
      return null
    }
    // follow header declare order
    this.block.set(binaryName, 0)
    this.block.set(u8.encode(octal.encode(mode, 6)), 100)
    this.block.set(u8.encode(octal.encode(uid, 6)), 108)
    this.block.set(u8.encode(octal.encode(gid, 6)), 116)
    // size
    const sizeWithOctal = octal.encode(size)
    if (sizeWithOctal.length > 11) {
      // big endian
      let overflowSize = size
      const t: number[] = []
      for (let i = 11; i > 0; i--) {
        t[11 - i] = overflowSize & 0xff
        overflowSize = Math.floor(overflowSize / 0x100)
      }
      t.unshift(0x80)
      this.block.set(new Uint8Array(t), 124)
    } else {
      this.block.set(u8.encode(octal.encode(size, 11)), 124)
    }
    // mtime
    this.block.set(u8.encode(octal.encode(mtime, 11)), 136)

    // typeflag
    this.block.set(u8.encode(ZERO_OFFSET + typeflag), 156)
    if (linkname) {
      this.block.set(u8.encode(linkname), 157)
    }
    // magic & version
    this.block.set(u8.encode(T_MAGIC), 257)
    this.block.set(u8.encode(T_VERSION), 263)
    if (uname) {
      this.block.set(u8.encode(uname), 265)
    }
    if (gname) {
      this.block.set(u8.encode(gname), 297)
    }
    this.block.set(u8.encode(octal.encode(devmajor, 6)), 329)
    this.block.set(u8.encode(octal.encode(devminor, 6)), 337)
    if (prefix) {
      this.block.set(u8.encode(prefix), 345)
    }
    // chksum
    let chksum = 0
    for (let i = 0; i < this.block.length; i++) {
      if (i >= 148 && i < 156) {
        chksum += 32
      } else {
        chksum += this.block[i]
      }
    }
    this.block.set(u8.encode(octal.encode(chksum, 6)), 148)
  }

  get data() {
    return this.block
  }
}

// This is an internal imlementation of tarball
// So we will avoid too much data conversion
export interface FileMeta {
  filename: string
  content: Uint8Array
}

export class Pack {
  private files: FileMeta[]
  constructor() {
    this.files = []
  }

  add(opt: FileMeta) {
    this.files.push(opt)
  }

  write() {
    const archive: Uint8Array[] = []
    for (const meta of this.files) {
      const header = <Options> {
        name: meta.filename,
        typeflag: TypeFlag.AREG_TYPE,
        mode: F_MODE,
        uid: U_ID,
        gid: G_ID,
        devmajor: 0,
        devminor: 0,
        size: meta.content.length,
        mtime: Math.floor(Date.now() / 1000)
      }
      const head = new Head(header)
      head.encode()
      archive.push(head.data)
      archive.push(meta.content)
      // Padding to 512-byte boundary
      const padding = new Uint8Array((512 - (meta.content.length % 512)) % 512)
      archive.push(padding)
    }
    archive.push(new Uint8Array(512))
    archive.push(new Uint8Array(512))
    return new Uint8Array(archive.reduce((acc, curr) => acc.concat(Array.from(curr)), []))
  }
}
