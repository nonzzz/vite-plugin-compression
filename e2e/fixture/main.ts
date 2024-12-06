import './theme.css'

const insertButton = document.querySelector('.button--insert')

insertButton.addEventListener('click', () => {
  import('./dynamic').then((module) => module.insertChildToLines()).catch(console.error)
  console.log('append child')
})

console.log('load main process')
