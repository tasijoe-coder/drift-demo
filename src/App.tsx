import { StarterShell } from './components/StarterShell'
import { useProjectTitle } from './hooks/useProjectTitle'

function App() {
  useProjectTitle()

  return <StarterShell />
}

export default App
