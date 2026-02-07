import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { OnboardingProvider } from './components/Onboarding.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <OnboardingProvider>
        <App />
      </OnboardingProvider>
    </ErrorBoundary>
  </StrictMode>,
)
