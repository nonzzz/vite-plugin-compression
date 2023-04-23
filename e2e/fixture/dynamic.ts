const lines = document.querySelector('.lines')

if (lines) {
  const p = document.createElement('p')
  const txt = lines.children.length + 1
  p.textContent = `p-${txt}`
}

export {}
