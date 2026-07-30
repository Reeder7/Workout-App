import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { ToastHost } from './components/ToastHost'
import { Train } from './pages/Train'
import { Session } from './pages/Session'
import { Plans } from './pages/Plans'
import { PlanEditor } from './pages/PlanEditor'
import { Progress } from './pages/Progress'
import { ExerciseDetail } from './pages/ExerciseDetail'
import { Library } from './pages/Library'
import { Settings } from './pages/Settings'
import { ImportPlan } from './pages/ImportPlan'
import { useStore } from './store/useStore'
import { applyTheme, watchSystemTheme } from './lib/theme'

export default function App() {
  const theme = useStore((s) => s.settings.theme ?? 'light')

  useEffect(() => {
    applyTheme(theme)
    return watchSystemTheme(() => theme)
  }, [theme])

  return (
    <>
      <Routes>
        <Route path="/" element={<Train />} />
        <Route path="/session" element={<Session />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/plans/:id" element={<PlanEditor />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/progress/:exerciseId" element={<ExerciseDetail />} />
        <Route path="/library" element={<Library />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/import" element={<ImportPlan />} />
      </Routes>
      <TabBar />
      <ToastHost />
    </>
  )
}
