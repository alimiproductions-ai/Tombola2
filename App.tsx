import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, getDocs, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';

// Code de secours : Si ça plante, on affiche pourquoi.
export default function App() {
  const [error, setError] = useState<string | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  // Vérification au démarrage
  useEffect(() => {
    if (!db) {
      setError("Les clés API Firebase sont manquantes ou incorrectes dans firebase.ts");
    } else {
      setIsDbReady(true);
    }
  }, []);

  if (error) {
    return (
      <div style={{ padding: 40, backgroundColor: '#ffe6e6', color: '#cc0000', textAlign: 'center' }}>
        <h1>⚠️ PROBLÈME DÉTECTÉ</h1>
        <p style={{ fontSize: '20px' }}>{error}</p>
        <p>Retourne dans le fichier <code>src/firebase.ts</code> et vérifie que tu as bien collé tes clés API à la place des "..."</p>
      </div>
    );
  }

  if (!isDbReady) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;
  }

  // Si tout va bien, on lance la vraie application
  return <TombolaApp />;
}

// --- LA VRAIE APPLICATION (Isolée pour ne pas tout casser) ---
function TombolaApp() {
  const [winners, setWinners] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ 
    title: "Tombola", primaryColor: "#e63946", backgroundColor: "#f1faee" 
  });
  const [drawStatus, setDrawStatus] = useState<any>({ state: 'idle' });
  const [showAdmin, setShowAdmin] = useState(false);

  // CHARGEMENT DONNÉES
  useEffect(() => {
    try {
      if (!db) return;
      
      const q = query(collection(db, "winners"), orderBy("wonAt", "desc"));
      onSnapshot(q, (snap) => setWinners(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

      onSnapshot(doc(db, "settings", "general"), (d) => {
        if (d.exists()) setSettings(d.data());
      });

      onSnapshot(doc(db, "status", "draw"), (d) => {
        if (d.exists()) setDrawStatus(d.data());
      });
    } catch (err: any) {
      console.error(err);
      alert("Erreur de connexion : " + err.message);
    }
  }, []);

  // --- FONCTIONS ADMIN ---
  const launchLiveDraw = async (ticket: string, name: string, prize: string) => {
    if(!db) return;
    await setDoc(doc(db, "status", "draw"), { state: 'rolling' });
    setTimeout(async () => {
      const winner = { ticketNumber: ticket, name, prize, wonAt: serverTimestamp() };
      await addDoc(collection(db, "winners"), winner);
      await setDoc(doc(db, "status", "draw"), { state: 'winner', currentWinner: winner });
    }, 4000);
  };

  const resetAll = async () => {
    if(!db) return;
    if(!confirm("Tout effacer ?")) return;
    const snap = await getDocs(collection(db, "winners"));
    snap.forEach(d => deleteDoc(d.ref));
  };

  const saveSettings = async (newSettings: any) => {
    if(!db) return;
    await setDoc(doc(db, "settings", "general"), newSettings);
  };

  // --- RENDU ---
  
  // 1. Mode ROULEMENT
  if (drawStatus.state === 'rolling') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: settings.primaryColor, color: 'white' }}>
        <h1>🥁 TIRAGE EN COURS...</h1>
      </div>
    );
  }

  // 2. Mode GAGNANT
  if (drawStatus.state === 'winner' && drawStatus.currentWinner) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#ffd700', textAlign: 'center' }}>
        <h1>🎉 {drawStatus.currentWinner.name} 🎉</h1>
        <h2>Ticket #{drawStatus.currentWinner.ticketNumber}</h2>
        <button onClick={() => setShowAdmin(true)} style={{ marginTop: 20 }}>Admin</button>
      </div>
    );
  }

  // 3. Mode LISTE (Normal)
  return (
    <div style={{ minHeight: '100vh', padding: 20, background: settings.backgroundColor }}>
      <h1 style={{ textAlign: 'center', color: settings.primaryColor }}>{settings.title}</h1>
      
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {winners.map(w => (
          <div key={w.id} style={{ padding: 20, background: 'white', borderLeft: `5px solid ${settings.primaryColor}`, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <strong>#{w.ticketNumber}</strong> <br/> {w.name} <br/> 🎁 {w.prize}
          </div>
        ))}
      </div>

      <button onClick={() => setShowAdmin(!showAdmin)} style={{ position: 'fixed', bottom: 20, right: 20, padding: 10 }}>⚙️</button>

      {/* ADMIN PANEL SIMPLIFIÉ */}
      {showAdmin && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '2px solid black', padding: 20 }}>
          <h3>Admin</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input id="adm-tick" placeholder="Ticket" />
            <input id="adm-name" placeholder="Nom" />
            <input id="adm-prize" placeholder="Lot" />
            <button onClick={() => {
              const t = (document.getElementById('adm-tick') as HTMLInputElement).value;
              const n = (document.getElementById('adm-name') as HTMLInputElement).value;
              const p = (document.getElementById('adm-prize') as HTMLInputElement).value;
              launchLiveDraw(t, n, p);
            }}>🚀 LANCER LIVE</button>
            <button onClick={resetAll} style={{ background: 'red', color: 'white' }}>🗑️ RESET</button>
            <div style={{ borderLeft: '1px solid #ccc', paddingLeft: 10, marginLeft: 10 }}>
              Design: 
              <input type="text" value={settings.title} onChange={e => setSettings({...settings, title: e.target.value})} />
              <input type="color" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})} />
              <input type="color" value={settings.backgroundColor} onChange={e => setSettings({...settings, backgroundColor: e.target.value})} />
              <button onClick={() => saveSettings(settings)}>💾 Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
