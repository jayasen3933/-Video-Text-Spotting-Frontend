import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import './index.css';
import Layout from './components/Layout';
import { HealthProvider } from './lib/health';
import NewAnalysis from './pages/NewAnalysis';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import NotFound from './pages/NotFound';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <NewAnalysis /> },
      { path: '/jobs', element: <Jobs /> },
      { path: '/jobs/:id', element: <JobDetail /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HealthProvider>
      <RouterProvider router={router} />
    </HealthProvider>
  </StrictMode>,
);
