import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // On importe le composant principal

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);

// On lance l'application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
