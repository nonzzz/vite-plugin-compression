import cat from './cat.gif'

const app = document.querySelector('#app')

const imgEl = document.createElement('img')

imgEl.src = cat
app.appendChild(imgEl)

console.log('hello world')
