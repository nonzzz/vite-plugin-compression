import './theme.css'

const insertButton = document.querySelector('.button--insert') as HTMLButtonElement

insertButton.addEventListener('click', () => {
  import('./dynamic').then((module) => module.insertChildToLines())
  console.log('append child')
})

console.log('load main process')
