import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { MainCanvas } from './canvas/MainCanvas'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <MainCanvas></MainCanvas>
    </div>
  )
}

export default App
