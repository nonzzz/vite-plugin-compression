const { nonzzz } = require('eslint-config-kagura')

module.exports = nonzzz({ typescript: true }, {
  ignores: [
    '**/node_modules',
    '**/dist',
    '**/components.d.ts',
    '**/analysis'
  ]
})
