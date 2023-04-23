import './theme.css'

const insertButton = document.querySelector('.button--insert') as HTMLButtonElement

insertButton.addEventListener('click', () => {
  const uuId = new Date().getTime()
  import(`./dynamic?t=${uuId}`)
})
