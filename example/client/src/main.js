import { seq } from './seq'

const app = document.querySelector('#app')

const button = document.createElement('button')

button.textContent = 'Click Me'

button.addEventListener('click', () => {
  console.log('Button Clicked')
  import('./dynamic').then((re) => {
    console.log(re.d)
    re.injectElement()
  })
})

app.appendChild(button)

console.log(seq)
