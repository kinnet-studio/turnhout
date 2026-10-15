import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DesignerPage } from '@/pages/designer/designer-page';
import { HeartsDemoPage } from '@/pages/hearts-demo/hearts-demo-page';

/** The game designer lives at `/#designer`; every other address shows the Hearts demo. */
function App() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return hash === '#designer' ? <DesignerPage /> : <HeartsDemoPage />;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
