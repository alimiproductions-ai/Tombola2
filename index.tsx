import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // On importe le composant principal
import './index.css'; // Si tu as un fichier CSS global (sinon supprime cette ligne)

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);

// On lance l'application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
