import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TableDemoPage } from '@/pages/table-demo/table-demo-page';

createRoot(document.getElementById('root')!).render(<StrictMode><TableDemoPage /></StrictMode>);
