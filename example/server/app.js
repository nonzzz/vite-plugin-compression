const http = require('http')
const path = require('path')
const fs = require('fs')

const defaultWD = process.cwd()

const originalPath = path.join(defaultWD, 'dist')
const html = path.join(defaultWD, 'dist', 'index.html')

function createServer() {
  const server = http.createServer()

  server.on('request', (req, res) => {
    if (req.url === '/') {
      fs.readFile(html, (err, data) => {
        if (err) return res.end('Error Render')
        res.setHeader('content-type', 'text/html')
        res.end(data)
      })
    }

    if (req.url.indexOf('/assets/') !== -1 || req.url.indexOf('/js/') !== -1) {
      const target = req.url + '.gz'
      fs.readFile(path.join(originalPath, target), (err, data) => {
        if (err) {
          res.writeHead(404)
          res.end(http.STATUS_CODES['404'])
          return
        }
        res.writeHead(200, {
          'Content-Type': req.url.endsWith('.css') ? 'text/css' : 'text/javascript',
          'Content-Encoding': 'gzip',
        })
        res.write(data)
        res.end()
      })
    }
  })

  server.listen(0, () => {
    const { port } = server.address()
    console.log(`server run on http://localhost:${port}`)
  })
}

function main() {
  if (!fs.existsSync(originalPath)) throw new Error('Please check your\'re already run \'npm run build\'')

  createServer()
}

main()
