import { Toaster } from '@/components/ui/sonner'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { useUIStore } from '@/app/stores/uiStore'
import { AppRouter } from './router/AppRouter'

import { Router } from './router/Router';

function App() {
  return <Router />;
}

export default App;