import { F_MODE, G_ID, Head, Mode, TypeFlag, U_ID, octal, u8 } from 'src/tar'

// const pack = new Pack()

// const text = u8.encode('hello world')

// pack.add({ filenmae: 'hello.txt', content: text })

// console.log(F_MODE, D_MODE)

// const v = octal.encode(F_MODE, 6)

// console.log(v)

const head = new Head({
  name: 'hello.txt',
  typeflag: TypeFlag.CHR_TYPE,
  mode: F_MODE,
  linkname: '',
  uid: U_ID,
  gid: G_ID,
  devmajor: 0,
  devminor: 0,
  size: 10000,
  mtime: Math.floor(Date.now() / 1000)
})
head.encode()
console.log(head.data)
console.log(u8.decode(head.data))

console.log(octal.encode(Mode.TS_UID))

console.log(new Date())
