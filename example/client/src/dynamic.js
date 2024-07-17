import('./dynamic.css')

export const d = 'dynamic'

export function injectElement() {
  const app = document.querySelector('#app')

  const el = document.createElement('p')

  el.textContent = 'Dynamic Element'
  app.appendChild(el)
}
