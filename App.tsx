import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, query, orderBy } from 'firebase/firestore';
import { AppSettings, Winner, DrawStatus } from './types';
import { AdminPanel } from './components/AdminPanel';

// Valeurs par défaut
const defaultSettings: AppSettings = {
  title: "Grande Tombola",
  primaryColor: "#e63946", // Rouge par défaut
  backgroundColor: "#f1faee", // Blanc cassé par défaut
};

function App() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [drawStatus, setDrawStatus] = useState<DrawStatus>({ state: 'idle' });
  const [showAdmin, setShowAdmin] = useState(false);

  // 1. Écouter les gagnants en temps réel
  useEffect(() => {
    const q = query(collection(db, "winners"), orderBy("wonAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const winnersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Winner[];
      setWinners(winnersList);
    });
    return () => unsubscribe();
  }, []);

  // 2. Écouter la configuration (Titre, couleurs)
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "general"), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as AppSettings);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Écouter le statut du LIVE (Animation tirage)
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "status", "draw"), (doc) => {
      if (doc.exists()) {
        setDrawStatus(doc.data() as DrawStatus);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- RENDU DE L'APPLICATION ---

  // MODE : ANIMATION DE TIRAGE (Plein écran)
  if (drawStatus.state === 'rolling') {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', flexDirection: 'column', 
        justifyContent: 'center', alignItems: 'center', 
        backgroundColor: settings.primaryColor, color: 'white' 
      }}>
        <h1>🎲 TIRAGE EN COURS...</h1>
        <div className="spinner" style={{ fontSize: '50px', marginTop: '20px' }}>🥁 🥁 🥁</div>
      </div>
    );
  }

  // MODE : GAGNANT VIENT DE SORTIR (Plein écran)
  if (drawStatus.state === 'winner' && drawStatus.currentWinner) {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', flexDirection: 'column', 
        justifyContent: 'center', alignItems: 'center', 
        backgroundColor: '#ffd700', color: 'black', textAlign: 'center'
      }}>
        <h1>🎉 FÉLICITATIONS ! 🎉</h1>
        <h2 style={{ fontSize: '3rem' }}>{drawStatus.currentWinner.name}</h2>
        <h3>Ticket N° {drawStatus.currentWinner.ticketNumber}</h3>
        <p>Remporte : {drawStatus.currentWinner.prize}</p>
        
        {/* Petit bouton caché pour que l'admin puisse sortir de l'écran gagnant s'il est bloqué */}
        <button onClick={() => setShowAdmin(true)} style={{ opacity: 0.1, marginTop: '50px' }}>Admin</button>
      </div>
    );
  }

  // MODE : LISTE NORMALE (Mur des gagnants)
  return (
    <div style={{ minHeight: '100vh', padding: '20px', backgroundColor: settings.backgroundColor }}>
      
      {/* En-tête configurables */}
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: settings.primaryColor, fontSize: '3rem' }}>{settings.title}</h1>
        <p>Les tickets gagnants s'affichent ici en direct</p>
      </header>

      {/* Grille des gagnants */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
        gap: '20px', 
        maxWidth: '1200px', 
        margin: '0 auto' 
      }}>
        {winners.map((winner) => (
          <div key={winner.id} style={{ 
            backgroundColor: 'white', 
            border: `2px solid ${settings.primaryColor}`, 
            borderRadius: '10px', 
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: settings.primaryColor }}>
              #{winner.ticketNumber}
            </div>
            <div style={{ fontSize: '1.2rem', margin: '10px 0' }}>{winner.name}</div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>🎁 {winner.prize}</div>
          </div>
        ))}
      </div>

      {winners.length === 0 && (
        <p style={{ textAlign: 'center', marginTop: '50px', opacity: 0.5 }}>
          Aucun gagnant pour le moment... Le tirage va commencer !
        </p>
      )}

      {/* Bouton pour ouvrir l'Admin */}
      <div style={{ marginTop: '50px', textAlign: 'center' }}>
        <button 
          onClick={() => setShowAdmin(!showAdmin)}
          style={{ padding: '10px', cursor: 'pointer', opacity: 0.5 }}
        >
          {showAdmin ? 'Fermer Admin' : 'Ouvrir Admin'}
        </button>
      </div>

      {/* Panneau Admin (Visible seulement si activé) */}
      {showAdmin && <AdminPanel currentSettings={settings} />}
    </div>
  );
}

export default App;
