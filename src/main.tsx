import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Wrapper } from '@/components/PixiCanvas';
import { initApp } from '@/utils/init-app';

function App() {
  const option = useMemo(() => ({ fullScreen: true, limitEntireViewPort: false }), []);
  return <Wrapper option={option} initFunction={initApp} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
