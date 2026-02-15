import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AppSettings } from '../types';

interface AdminPanelProps {
  currentSettings: AppSettings;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentSettings }) => {
  // Gestion des paramètres (Titre, Couleurs)
  const [settings, setSettings] = useState<AppSettings>(currentSettings);
  
  // Gestion du tirage manuel
  const [ticketInput, setTicketInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [prizeInput, setPrizeInput] = useState('');

  // 1. Sauvegarder la configuration (Titre & Couleurs)
  const saveConfig = async () => {
    try {
      await setDoc(doc(db, "settings", "general"), settings);
      alert("Configuration sauvegardée !");
    } catch (e) {
      console.error("Erreur config:", e);
    }
  };

  // 2. Fonction RESET (Supprimer tous les gagnants)
  const handleReset = async () => {
    if (!window.confirm("⚠️ ATTENTION : Cela va effacer TOUS les gagnants. Continuer ?")) return;
    
    try {
      const querySnapshot = await getDocs(collection(db, "winners"));
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      alert("Mur des gagnants réinitialisé.");
    } catch (e) {
      console.error("Erreur reset:", e);
    }
  };

  // 3. Fonction LIVE : Lancer le tirage pour tout le monde
  const launchLiveDraw = async () => {
    if (!ticketInput || !nameInput) return alert("Remplissez le nom et le ticket !");

    // A. On met le statut en "Roulement de tambour" (rolling)
    await setDoc(doc(db, "status", "draw"), { state: 'rolling' });

    // B. On attend 3 secondes (suspense)
    setTimeout(async () => {
      const newWinner = {
        ticketNumber: ticketInput,
        name: nameInput,
        prize: prizeInput || "Lot surprise",
        wonAt: serverTimestamp()
      };

      // C. On ajoute le gagnant à la liste officielle
      await addDoc(collection(db, "winners"), newWinner);

      // D. On met à jour le statut pour afficher le gagnant en LIVE
      await setDoc(doc(db, "status", "draw"), {
        state: 'winner',
        currentWinner: newWinner
      });

    }, 4000); // 4 secondes de délai
  };

  // 4. Fonction pour arrêter le mode Live (retour à la normale)
  const stopLive = async () => {
    await setDoc(doc(db, "status", "draw"), { state: 'idle', currentWinner: null });
  };

  return (
    <div style={{ padding: '20px', background: '#f0f0f0', border: '2px solid #333', marginTop: '20px' }}>
      <h2>⚙️ Panneau Admin</h2>
      
      <div style={{ marginBottom: '20px', padding: '10px', background: 'white' }}>
        <h3>🎨 Personnalisation</h3>
        <input 
          type="text" 
          placeholder="Titre de la Tombola"
          value={settings.title} 
          onChange={(e) => setSettings({...settings, title: e.target.value})} 
          style={{ display: 'block', margin: '5px 0' }}
        />
        <label>Couleur principale: </label>
        <input 
          type="color" 
          value={settings.primaryColor} 
          onChange={(e) => setSettings({...settings, primaryColor: e.target.value})} 
        />
        <label> Fond: </label>
        <input 
          type="color" 
          value={settings.backgroundColor} 
          onChange={(e) => setSettings({...settings, backgroundColor: e.target.value})} 
        />
        <button onClick={saveConfig} style={{ marginLeft: '10px' }}>Sauvegarder le design</button>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', background: '#ffe6e6' }}>
        <h3>🗑️ Zone de Danger</h3>
        <button onClick={handleReset} style={{ color: 'red', fontWeight: 'bold' }}>
          RESET LE MUR DES GAGNANTS
        </button>
      </div>

      <div style={{ padding: '10px', background: '#e6f7ff' }}>
        <h3>🎲 Lancer un Tirage (LIVE)</h3>
        <input placeholder="Numéro Ticket" value={ticketInput} onChange={e => setTicketInput(e.target.value)} />
        <input placeholder="Nom du gagnant" value={nameInput} onChange={e => setNameInput(e.target.value)} />
        <input placeholder="Lot (optionnel)" value={prizeInput} onChange={e => setPrizeInput(e.target.value)} />
        <br />
        <button onClick={launchLiveDraw} style={{ marginTop: '10px', fontSize: '18px', cursor: 'pointer' }}>
          🚀 LANCER LE TIRAGE LIVE
        </button>
        <button onClick={stopLive} style={{ marginTop: '10px', marginLeft: '10px' }}>
          ⏹ Arrêter le mode Live
        </button>
      </div>
    </div>
  );
};
