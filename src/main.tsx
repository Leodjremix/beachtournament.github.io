import React from 'react';
import ReactDOM from 'react-dom/client';
import TestGroupStandings from './components/TestGroupStandings';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TestGroupStandings />
  </React.StrictMode>,
);
