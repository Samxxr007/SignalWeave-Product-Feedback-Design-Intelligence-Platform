import React from 'react'
import { Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import ToastProvider from './components/ui/ToastProvider'

import Overview from './pages/Overview'
import Intake from './pages/Intake'
import Preparation from './pages/Preparation'
import Analytics from './pages/Analytics'
import MiningLab from './pages/MiningLab'
import EmergingSignals from './pages/EmergingSignals'
import Opportunities from './pages/Opportunities'
import FeatureRequests from './pages/FeatureRequests'
import RoadmapSimulator from './pages/RoadmapSimulator'
import Reports from './pages/Reports'

export function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Overview />} />
          <Route path="/intake" element={<Intake />} />
          <Route path="/preparation" element={<Preparation />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/mining" element={<MiningLab />} />
          <Route path="/signals" element={<EmergingSignals />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/features" element={<FeatureRequests />} />
          <Route path="/roadmap" element={<RoadmapSimulator />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}

export default App
