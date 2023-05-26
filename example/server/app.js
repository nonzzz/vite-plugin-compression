const http = require('http')
const path = require('path')
const fs = require('fs')
const sirv = require('sirv')

const defaultWD = process.cwd()

const publicPath = path.join(defaultWD, 'dist')

const assets = sirv(publicPath, { gzip: true })

function createServer() {
  const server = http.createServer()

  server.on('request', (req, res) => {
    assets(req, res, () => {
      res.statusCode = 404
      res.end('File not found')
    })
  })


  server.listen(0, () => {
    const { port } = server.address()
    console.log(`server run on http://localhost:${port}`)
  })
}

function main() {
  if (!fs.existsSync(publicPath)) throw new Error('Please check your\'re already run \'npm run build\'')
  createServer()
}

main()
