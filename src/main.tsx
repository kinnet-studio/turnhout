import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NetDemoPage } from '@/pages/net-demo/net-demo-page';

createRoot(document.getElementById('root')!).render(<StrictMode><NetDemoPage /></StrictMode>);
