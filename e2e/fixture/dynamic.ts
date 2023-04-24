export function insertChildToLines() {
  const lines = document.querySelector('.lines')
  const p = document.createElement('p')
  const txt = lines.children.length + 1
  p.textContent = `p-${txt}`
  lines.appendChild(p)
}
