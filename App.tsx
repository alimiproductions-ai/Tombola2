import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // Importe la connexion qu'on vient de créer
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

// Valeurs par défaut
const defaultSettings: AppSettings = {
  title: "Grande Tombola",
  primaryColor: "#e63946", // Rouge
  backgroundColor: "#f1faee", // Blanc cassé
};

// --- COMPOSANT ADMIN (Le panneau de contrôle) ---
const AdminPanel = ({ currentSettings, closePanel }: { currentSettings: AppSettings, closePanel: () => void }) => {
  const [settings, setSettings] = useState<AppSettings>(currentSettings);
  const [ticketInput, setTicketInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [prizeInput, setPrizeInput] = useState('');

  // Sauvegarder les couleurs/titres
  const saveConfig = async () => {
    try {
      await setDoc(doc(db, "settings", "general"), settings);
      alert("✅ Configuration sauvegardée !");
    } catch (e) {
      console.error(e);
      alert("❌ Erreur sauvegarde");
    }
  };

  // RESET TOTAL
  const handleReset = async () => {
    if (!window.confirm("⚠️ ATTENTION : Cela va effacer TOUS les gagnants. Continuer ?")) return;
    try {
      const querySnapshot = await getDocs(collection(db, "winners"));
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      alert("🗑️ Mur des gagnants vidé.");
    } catch (e) {
      console.error(e);
    }
  };

  // LANCER LE LIVE
  const launchLiveDraw = async () => {
    if (!ticketInput || !nameInput) return alert("Remplissez le nom et le ticket !");

    // 1. Animation "Roulement de tambour"
    await setDoc(doc(db, "status", "draw"), { state: 'rolling' });

    // 2. Attente de 4 secondes
    setTimeout(async () => {
      const newWinner = {
        ticketNumber: ticketInput,
        name: nameInput,
        prize: prizeInput || "Lot surprise",
        wonAt: serverTimestamp()
      };

      // 3. Sauvegarde le gagnant dans l'historique
      await addDoc(collection(db, "winners"), newWinner);

      // 4. Affiche le gagnant à l'écran
      await setDoc(doc(db, "status", "draw"), {
        state: 'winner',
        currentWinner: newWinner
      });
    }, 4000);
  };

  // Arrêter le mode Live
  const stopLive = async () => {
    await setDoc(doc(db, "status", "draw"), { state: 'idle', currentWinner: null });
  };

  return (
    <div style={{ 
      position: 'fixed', bottom: 0, left: 0, right: 0, 
      background: 'white', borderTop: '4px solid #333', padding: '20px', 
      boxShadow: '0 -5px 20px rgba(0,0,0,0.2)', zIndex: 1000,
      maxHeight: '60vh', overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>⚙️ Panneau Admin</h2>
        <button onClick={closePanel} style={{ background: 'red', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' }}>Fermer X</button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        {/* Colonne 1 : Design */}
        <div style={{ padding: '10px', background: '#f9f9f9', borderRadius: '5px' }}>
          <h3>🎨 Design</h3>
          <input 
            type="text" placeholder="Titre Tombola" value={settings.title} 
            onChange={(e) => setSettings({...settings, title: e.target.value})} 
            style={{ width: '90%', marginBottom: '10px', padding: '5px' }}
          />
          <div>
            <label>Couleur:</label> <input type="color" value={settings.primaryColor} onChange={(e) => setSettings({...settings, primaryColor: e.target.value})} />
          </div>
          <div>
            <label>Fond:</label> <input type="color" value={settings.backgroundColor} onChange={(e) => setSettings({...settings, backgroundColor: e.target.value})} />
          </div>
          <button onClick={saveConfig} style={{ marginTop: '10px', cursor: 'pointer' }}>💾 Sauvegarder</button>
        </div>

        {/* Colonne 2 : Tirage */}
        <div style={{ padding: '10px', background: '#e6f7ff', borderRadius: '5px' }}>
          <h3>🎲 Lancer Tirage</h3>
          <input placeholder="N° Ticket" value={ticketInput} onChange={e => setTicketInput(e.target.value)} style={{ display: 'block', width: '90%', marginBottom: '5px' }}/>
          <input placeholder="Nom Gagnant" value={nameInput} onChange={e => setNameInput(e.target.value)} style={{ display: 'block', width: '90%', marginBottom: '5px' }}/>
          <input placeholder="Lot (Ex: iPad)" value={prizeInput} onChange={e => setPrizeInput(e.target.value)} style={{ display: 'block', width: '90%', marginBottom: '5px' }}/>
          
          <button onClick={launchLiveDraw} style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            🚀 LANCER LE LIVE
          </button>
          <button onClick={stopLive} style={{ marginTop: '5px', width: '100%', cursor: 'pointer' }}>⏹ Arrêter Live</button>
        </div>

        {/* Colonne 3 : Danger */}
        <div style={{ padding: '10px', background: '#ffe6e6', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={handleReset} style={{ color: 'red', fontWeight: 'bold', border: '2px solid red', background: 'white', padding: '10px', cursor: 'pointer' }}>
            🗑️ VIDER TOUTE LA LISTE
          </button>
        </div>
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

  // CHARGEMENT DES DONNÉES EN TEMPS RÉEL
  useEffect(() => {
    // 1. Liste des gagnants
    const q = query(collection(db, "winners"), orderBy("wonAt", "desc"));
    const unsubWinners = onSnapshot(q, (snap) => {
      setWinners(snap.docs.map(d => ({ id: d.id, ...d.data() } as Winner)));
    });

    // 2. Paramètres (Couleurs, Titre)
    const unsubSettings = onSnapshot(doc(db, "settings", "general"), (doc) => {
      if (doc.exists()) setSettings(doc.data() as AppSettings);
    });

    // 3. Statut du Live
    const unsubStatus = onSnapshot(doc(db, "status", "draw"), (doc) => {
      if (doc.exists()) setDrawStatus(doc.data() as DrawStatus);
    });

    return () => { unsubWinners(); unsubSettings(); unsubStatus(); };
  }, []);

  // --- ECRAN 1 : MODE ROULEMENT DE TAMBOUR ---
  if (drawStatus.state === 'rolling') {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', flexDirection: 'column', 
        justifyContent: 'center', alignItems: 'center', 
        backgroundColor: settings.primaryColor, color: 'white' 
      }}>
        <h1 style={{ fontSize: '4rem', textAlign: 'center', margin: 0 }}>🎲 TIRAGE EN COURS...</h1>
        <div style={{ fontSize: '8rem', marginTop: '20px' }}>🥁</div>
      </div>
    );
  }

  // --- ECRAN 2 : MODE GAGNANT (CONFETTIS) ---
  if (drawStatus.state === 'winner' && drawStatus.currentWinner) {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', flexDirection: 'column', 
        justifyContent: 'center', alignItems: 'center', 
        backgroundColor: '#ffd700', color: '#333', textAlign: 'center', padding: '20px'
      }}>
        <h1>🎉 FÉLICITATIONS ! 🎉</h1>
        <h2 style={{ fontSize: '5rem', margin: '20px 0' }}>{drawStatus.currentWinner.name}</h2>
        <div style={{ fontSize: '2.5rem', background: 'white', padding: '15px 40px', borderRadius: '50px', marginBottom: '30px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
          Ticket N° {drawStatus.currentWinner.ticketNumber}
        </div>
        <h3 style={{ fontSize: '2rem' }}>Remporte : {drawStatus.currentWinner.prize}</h3>
        
        {/* Bouton de secours pour l'admin */}
        <button onClick={() => setShowAdmin(true)} style={{ position: 'absolute', bottom: '10px', right: '10px', opacity: 0.3 }}>Admin</button>
        {showAdmin && <AdminPanel currentSettings={settings} closePanel={() => setShowAdmin(false)} />}
      </div>
    );
  }

  // --- ECRAN 3 : LISTE NORMALE (MUR DES GAGNANTS) ---
  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', backgroundColor: settings.backgroundColor, fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      
      <header style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ color: settings.primaryColor, fontSize: '3.5rem', margin: '0', textTransform: 'uppercase', letterSpacing: '2px' }}>{settings.title}</h1>
        <p style={{ color: '#555', fontSize: '1.2rem', marginTop: '10px' }}>Voici les résultats officiels en direct</p>
      </header>

      {/* Grille des tickets */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '30px', 
        maxWidth: '1200px', 
        margin: '0 auto' 
      }}>
        {winners.map((winner) => (
          <div key={winner.id} style={{ 
            backgroundColor: 'white', 
            borderLeft: `8px solid ${settings.primaryColor}`, 
            borderRadius: '12px', 
            padding: '25px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: settings.primaryColor }}>#{winner.ticketNumber}</span>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#aaa', letterSpacing: '1px' }}>Gagnant</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#333', marginBottom: '15px' }}>{winner.name}</div>
            <div style={{ paddingTop: '15px', borderTop: '1px solid #f0f0f0', color: '#666', fontSize: '1rem' }}>
              🎁 {winner.prize}
            </div>
          </div>
        ))}
      </div>

      {winners.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '80px', color: '#999' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎟️</div>
          <h2>Aucun ticket tiré pour le moment</h2>
          <p>Le tirage va commencer sous peu...</p>
        </div>
      )}

      {/* Bouton Admin Flottant */}
      <button 
        onClick={() => setShowAdmin(true)}
        style={{ 
          position: 'fixed', bottom: '20px', right: '20px', 
          background: '#333', color: 'white', border: 'none', 
          width: '50px', height: '50px', borderRadius: '50%', 
          cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          fontSize: '24px'
        }}
        title="Ouvrir le panneau Admin"
      >
        ⚙️
      </button>

      {/* Le Panneau Admin s'affiche ici si ouvert */}
      {showAdmin && <AdminPanel currentSettings={settings} closePanel={() => setShowAdmin(false)} />}
    </div>
  );
}

export default App;
