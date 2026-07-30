import { Routes, Route } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { Train } from './pages/Train'
import { Session } from './pages/Session'
import { Plans } from './pages/Plans'
import { PlanEditor } from './pages/PlanEditor'
import { Progress } from './pages/Progress'
import { ExerciseDetail } from './pages/ExerciseDetail'
import { Library } from './pages/Library'
import { Settings } from './pages/Settings'
import { ImportPlan } from './pages/ImportPlan'

export default function App() {
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
    </>
  )
}
