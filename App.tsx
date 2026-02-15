import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // Assure-toi que ce fichier existe bien à côté
import { 
  collection, 
  onSnapshot, 
  doc, 
  query, 
  orderBy, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// --- TYPES (Définitions) ---
interface Winner {
  id: string;
  ticketNumber: string;
  name: string;
  prize: string;
  wonAt: any;
}

interface AppSettings {
  title: string;
  primaryColor: string;
  backgroundColor: string;
}

interface DrawStatus {
  state: 'idle' | 'rolling' | 'winner';
  currentWinner?: Winner | null;
}

// Valeurs par défaut si la base de données est vide
const defaultSettings: AppSettings = {
  title: "Grande Tombola",
  primaryColor: "#e63946",
  backgroundColor: "#f1faee",
};

// --- COMPOSANT ADMIN (Intégré ici pour éviter les erreurs) ---
const AdminPanel = ({ currentSettings }: { currentSettings: AppSettings }) => {
  const [settings, setSettings] = useState<AppSettings>(currentSettings);
  const [ticketInput, setTicketInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [prizeInput, setPrizeInput] = useState('');

  const saveConfig = async () => {
    try {
      await setDoc(doc(db, "settings", "general"), settings);
      alert("Configuration sauvegardée !");
    } catch (e) {
      console.error(e);
      alert("Erreur de sauvegarde (vérifie la console)");
    }
  };

  const handleReset = async () => {
    if (!window.confirm("⚠️ ATTENTION : Cela va effacer TOUS les gagnants. Continuer ?")) return;
    try {
      const querySnapshot = await getDocs(collection(db, "winners"));
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      alert("Mur des gagnants réinitialisé.");
    } catch (e) {
      console.error(e);
    }
  };

  const launchLiveDraw = async () => {
    if (!ticketInput || !nameInput) return alert("Remplissez le nom et le ticket !");

    // 1. Animation
    await setDoc(doc(db, "status", "draw"), { state: 'rolling' });

    // 2. Attente puis affichage gagnant
    setTimeout(async () => {
      const newWinner = {
        ticketNumber: ticketInput,
        name: nameInput,
        prize: prizeInput || "Lot surprise",
        wonAt: serverTimestamp()
      };

      // Ajout à l'historique
      await addDoc(collection(db, "winners"), newWinner);

      // Affichage du gagnant en LIVE
      await setDoc(doc(db, "status", "draw"), {
        state: 'winner',
        currentWinner: newWinner
      });
    }, 4000);
  };

  const stopLive = async () => {
    await setDoc(doc(db, "status", "draw"), { state: 'idle', currentWinner: null });
  };

  return (
    <div style={{ padding: '20px', background: '#f0f0f0', border: '2px solid #333', marginTop: '50px', borderRadius: '8px' }}>
      <h2>⚙️ Panneau Admin</h2>
      
      {/* Configuration */}
      <div style={{ marginBottom: '15px', padding: '10px', background: 'white', borderRadius: '5px' }}>
        <h3>🎨 Design</h3>
        <input 
          type="text" 
          placeholder="Titre"
          value={settings.title} 
          onChange={(e) => setSettings({...settings, title: e.target.value})} 
          style={{ width: '100%', marginBottom: '5px', padding: '5px' }}
        />
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label>Couleur:</label>
          <input type="color" value={settings.primaryColor} onChange={(e) => setSettings({...settings, primaryColor: e.target.value})} />
          <label>Fond:</label>
          <input type="color" value={settings.backgroundColor} onChange={(e) => setSettings({...settings, backgroundColor: e.target.value})} />
        </div>
        <button onClick={saveConfig} style={{ marginTop: '10px', padding: '5px 10px', cursor: 'pointer' }}>💾 Sauvegarder</button>
      </div>

      {/* Tirage */}
      <div style={{ marginBottom: '15px', padding: '10px', background: '#e6f7ff', borderRadius: '5px' }}>
        <h3>🎲 Lancer Tirage LIVE</h3>
        <div style={{ display: 'grid', gap: '5px', marginBottom: '10px' }}>
          <input placeholder="Numéro Ticket" value={ticketInput} onChange={e => setTicketInput(e.target.value)} style={{ padding: '5px' }}/>
          <input placeholder="Nom Gagnant" value={nameInput} onChange={e => setNameInput(e.target.value)} style={{ padding: '5px' }}/>
          <input placeholder="Lot (Ex: iPad)" value={prizeInput} onChange={e => setPrizeInput(e.target.value)} style={{ padding: '5px' }}/>
        </div>
        <button onClick={launchLiveDraw} style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>
          🚀 LANCER
        </button>
        <button onClick={stopLive} style={{ marginTop: '5px', width: '100%', padding: '5px', cursor: 'pointer' }}>⏹ Arrêter Live</button>
      </div>

      {/* Reset */}
      <div style={{ padding: '10px', background: '#ffe6e6', borderRadius: '5px' }}>
        <button onClick={handleReset} style={{ color: 'red', fontWeight: 'bold', border: '1px solid red', background: 'white', padding: '5px 10px', cursor: 'pointer' }}>
          🗑️ RESET TOUT
        </button>
      </div>
    </div>
  );
};

// --- APPLICATION PRINCIPALE ---
function App() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [drawStatus, setDrawStatus] = useState<DrawStatus>({ state: 'idle' });
  const [showAdmin, setShowAdmin] = useState(false);

  // Chargement des données
  useEffect(() => {
    // 1. Gagnants
    const q = query(collection(db, "winners"), orderBy("wonAt", "desc"));
    const unsubWinners = onSnapshot(q, (snap) => {
      setWinners(snap.docs.map(d => ({ id: d.id, ...d.data() } as Winner)));
    });

    // 2. Paramètres
    const unsubSettings = onSnapshot(doc(db, "settings", "general"), (doc) => {
      if (doc.exists()) setSettings(doc.data() as AppSettings);
    });

    // 3. Statut Live
    const unsubStatus = onSnapshot(doc(db, "status", "draw"), (doc) => {
      if (doc.exists()) setDrawStatus(doc.data() as DrawStatus);
    });

    return () => { unsubWinners(); unsubSettings(); unsubStatus(); };
  }, []);

  // --- RENDU : MODE LIVE (Roulement de tambour) ---
  if (drawStatus.state === 'rolling') {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', flexDirection: 'column', 
        justifyContent: 'center', alignItems: 'center', 
        backgroundColor: settings.primaryColor, color: 'white' 
      }}>
        <h1 style={{ fontSize: '4rem', textAlign: 'center' }}>🎲 TIRAGE EN COURS...</h1>
        <div style={{ fontSize: '5rem', marginTop: '20px', animation: 'spin 1s infinite' }}>🥁</div>
      </div>
    );
  }

  // --- RENDU : MODE GAGNANT (Résultat Live) ---
  if (drawStatus.state === 'winner' && drawStatus.currentWinner) {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', flexDirection: 'column', 
        justifyContent: 'center', alignItems: 'center', 
        backgroundColor: '#ffd700', color: '#333', textAlign: 'center', padding: '20px'
      }}>
        <h1>🎉 FÉLICITATIONS ! 🎉</h1>
        <h2 style={{ fontSize: '4rem', margin: '20px 0' }}>{drawStatus.currentWinner.name}</h2>
        <div style={{ fontSize: '2rem', background: 'white', padding: '10px 30px', borderRadius: '50px', marginBottom: '20px' }}>
          Ticket N° {drawStatus.currentWinner.ticketNumber}
        </div>
        <h3>Remporte : {drawStatus.currentWinner.prize}</h3>
        
        <button onClick={() => setShowAdmin(true)} style={{ position: 'absolute', bottom: '10px', opacity: 0.2 }}>Admin</button>
      </div>
    );
  }

  // --- RENDU : LISTE NORMALE ---
  return (
    <div style={{ minHeight: '100vh', padding: '20px', backgroundColor: settings.backgroundColor, fontFamily: 'sans-serif' }}>
      
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: settings.primaryColor, fontSize: '3rem', margin: '0' }}>{settings.title}</h1>
        <p style={{ color: '#666' }}>Les résultats en direct</p>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '20px', 
        maxWidth: '1200px', 
        margin: '0 auto' 
      }}>
        {winners.map((winner) => (
          <div key={winner.id} style={{ 
            backgroundColor: 'white', 
            borderLeft: `5px solid ${settings.primaryColor}`, 
            borderRadius: '8px', 
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: settings.primaryColor }}>#{winner.ticketNumber}</span>
              <span style={{ fontSize: '0.8rem', color: '#999' }}>Gagnant</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '10px 0' }}>{winner.name}</div>
            <div style={{ paddingTop: '10px', borderTop: '1px solid #eee' }}>🎁 {winner.prize}</div>
          </div>
        ))}
      </div>

      {winners.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '50px', color: '#888' }}>
          <h2>Aucun gagnant pour l'instant</h2>
          <p>Le tirage va bientôt commencer !</p>
        </div>
      )}

      {/* Bouton Admin discret en bas de page */}
      <div style={{ marginTop: '80px', textAlign: 'center', paddingBottom: '20px' }}>
        <button 
          onClick={() => setShowAdmin(!showAdmin)}
          style={{ background: 'transparent', border: '1px solid #ccc', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', color: '#999' }}
        >
          {showAdmin ? 'Fermer Admin' : 'Admin'}
        </button>
        
        {showAdmin && <AdminPanel currentSettings={settings} />}
      </div>
    </div>
  );
}

export default App;
