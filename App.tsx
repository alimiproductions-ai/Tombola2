import React from 'react';

// Le mot "default" ici est SUPER important pour que index.tsx le comprenne
export default function App() {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#f0f0f0',
      color: 'black'
    }}>
      <div style={{ padding: 40, background: 'white', borderRadius: 10 }}>
        <h1>✅ Ça marche !</h1>
        <p>Si tu vois cet écran, c'est que la réparation a fonctionné.</p>
        <p>On peut maintenant remettre le code de la Tombola.</p>
      </div>
    </div>
  );
}
