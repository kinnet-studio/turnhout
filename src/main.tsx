import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HeartsDemoPage } from '@/pages/hearts-demo/hearts-demo-page';

createRoot(document.getElementById('root')!).render(<StrictMode><HeartsDemoPage /></StrictMode>);
