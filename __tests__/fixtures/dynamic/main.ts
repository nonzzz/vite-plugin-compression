import './style.css'

import('./code').then(({ result }) => {
  console.log(result)
}).catch(console.error)
