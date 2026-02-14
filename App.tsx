import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, remove, update } from "firebase/database";

// --- 1. CONFIGURATION FIREBASE (Tes clés réelles) ---
const firebaseConfig = {
  apiKey: "AIzaSyAZDCN7LTHrGacH-Y8mBStZ1eml5xeImo4",
  authDomain: "tombola-731c0.firebaseapp.com",
  databaseURL: "https://tombola-731c0-default-rtdb.firebaseio.com",
  projectId: "tombola-731c0",
  storageBucket: "tombola-731c0.firebasestorage.app",
  messagingSenderId: "987970383398",
  appId: "1:987970383398:web:93c7a8994ebe44b33d80e7",
  measurementId: "G-XCRP9XHQN1"
};

// Initialisation sécurisée
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- 2. LOGIQUE MÉTIER & TYPES ---
const ADMIN_PASSWORD = "admin";

interface Pack { id: string; name: string; price: string; tickets: number; }
interface Prize { id: string; name: string; image: string; winner?: string; }
interface Participant { id: string; name: string; tickets: number; packName: string; }

// --- 3. ICÔNES SVG (Intégrées pour éviter les bugs Vercel) ---
const Icon = {
  Gift: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Trophy: () => <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
};

export default function App() {
  // --- STATE ---
  const [view, setView] = useState<'GUEST' | 'ADMIN' | 'DRAW'>('GUEST');
  
  // Données
  const [packs, setPacks] = useState<Pack[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // Tirage
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawName, setDrawName] = useState("");
  const [lastWinner, setLastWinner] = useState<{name: string, prize: string} | null>(null);

  // --- INITIALISATION DES DONNÉES ---
  useEffect(() => {
    // Écoute Packs
    onValue(ref(db, 'packs'), (snap) => {
      const data = snap.val();
      setPacks(data ? Object.entries(data).map(([key, val]: any) => ({ id: key, ...val })) : []);
    });
    // Écoute Lots
    onValue(ref(db, 'prizes'), (snap) => {
      const data = snap.val();
      setPrizes(data ? Object.entries(data).map(([key, val]: any) => ({ id: key, ...val })) : []);
    });
    // Écoute Participants
    onValue(ref(db, 'participants'), (snap) => {
      const data = snap.val();
      setParticipants(data ? Object.entries(data).map(([key, val]: any) => ({ id: key, ...val })) : []);
    });
  }, []);

  // --- ACTIONS ---

  // 1. Ajouter un participant (User ou Admin)
  const addParticipant = (name: string, packId: string) => {
    const pack = packs.find(p => p.id === packId);
    if (!name || !pack) return;

    push(ref(db, 'participants'), {
      name: name,
      tickets: Number(pack.tickets),
      packName: pack.name,
      date: Date.now()
    });
    alert(`✅ ${name} inscrit avec ${pack.tickets} tickets !`);
  };

  // 2. Créer un Lot (Admin)
  const createPrize = () => {
    const name = prompt("Nom du lot ?");
    if (!name) return;
    push(ref(db, 'prizes'), { name, image: '', winner: '' });
  };

  // 3. Créer un Pack (Admin)
  const createPack = () => {
    push(ref(db, 'packs'), { name: "Nouveau Pack", price: "10€", tickets: 1 });
  };

  // 4. Mettre une image sur un lot
  const handleImage = (file: File, prizeId: string) => {
    const reader = new FileReader();
    reader.onloadend = () => update(ref(db, `prizes/${prizeId}`), { image: reader.result });
    reader.readAsDataURL(file);
  };

  // 5. LE TIRAGE AU SORT (La logique critique)
  const runDraw = (prizeId: string) => {
    if (participants.length === 0) return alert("Aucun participant !");

    // On crée une urne virtuelle : si David a 3 tickets, son nom apparait 3 fois dans le tableau.
    let urne: string[] = [];
    participants.forEach(p => {
      for (let i = 0; i < p.tickets; i++) {
        urne.push(p.name);
      }
    });

    setView('DRAW');
    setIsDrawing(true);

    // Animation de suspens
    let counter = 0;
    const interval = setInterval(() => {
      setDrawName(urne[Math.floor(Math.random() * urne.length)]);
      counter++;
      if (counter > 20) {
        clearInterval(interval);
        finalizeDraw(prizeId, urne);
      }
    }, 100);
  };

  const finalizeDraw = (prizeId: string, urne: string[]) => {
    const winnerName = urne[Math.floor(Math.random() * urne.length)];
    const prize = prizes.find(p => p.id === prizeId);
    
    // Sauvegarde en base
    update(ref(db, `prizes/${prizeId}`), { winner: winnerName });
    
    setIsDrawing(false);
    setLastWinner({ name: winnerName, prize: prize?.name || "Lot" });
  };

  // --- VUES ---

  // A. ÉCRAN DE TIRAGE
  if (view === 'DRAW') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        {isDrawing ? (
          <>
            <h1 className="text-4xl font-black text-indigo-500 mb-8 animate-pulse">TIRAGE EN COURS...</h1>
            <div className="text-6xl font-black bg-white/10 px-12 py-6 rounded-2xl border border-white/20">
              {drawName}
            </div>
          </>
        ) : lastWinner ? (
          <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl border border-yellow-500/50 animate-bounce-in">
            <h1 className="text-6xl font-black text-yellow-400 mb-4">BRAVO !</h1>
            <p className="text-2xl text-slate-300 mb-2">Le gagnant est :</p>
            <div className="text-5xl font-bold mb-6">{lastWinner.name}</div>
            <div className="bg-indigo-600/50 p-4 rounded-xl">
              Remporte : {lastWinner.prize}
            </div>
            <button onClick={() => setView('ADMIN')} className="mt-8 bg-white text-slate-900 px-6 py-2 rounded-full font-bold">
              Retour Admin
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  // B. ÉCRAN UTILISATEUR (Guest)
  if (view === 'GUEST') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-4 font-sans">
        <nav className="flex justify-between items-center mb-10 max-w-4xl mx-auto">
          <div className="font-black text-2xl text-white tracking-tighter">TOMBOLA<span className="text-indigo-500">2026</span></div>
          <button onClick={() => prompt("Admin Password") === ADMIN_PASSWORD && setView('ADMIN')} className="text-xs font-bold uppercase opacity-30">Admin</button>
        </nav>

        <header className="text-center mb-12">
          <h1 className="text-5xl font-black text-white mb-4">Tente ta chance</h1>
          <p className="text-indigo-400 font-bold uppercase tracking-widest">Gagne des lots incroyables</p>
        </header>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          {/* Section Lots */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Icon.Gift/> Lots à gagner</h2>
            <div className="grid gap-4">
              {prizes.map(p => (
                <div key={p.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
                  <div className="w-20 h-20 bg-slate-800 rounded-xl overflow-hidden flex-shrink-0">
                    {p.image ? <img src={p.image} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">No img</div>}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white">{p.name}</h3>
                    {p.winner ? (
                      <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded font-bold">Gagné par {p.winner}</span>
                    ) : (
                      <span className="text-xs text-emerald-400">En jeu</span>
                    )}
                  </div>
                </div>
              ))}
              {prizes.length === 0 && <p className="text-slate-500 italic">Aucun lot annoncé.</p>}
            </div>
          </div>

          {/* Section Achat Tickets */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Icon.User/> Inscription</h2>
            <div className="space-y-4">
              {packs.map(pack => (
                <div key={pack.id} className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700 hover:border-indigo-500 transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-white">{pack.name}</h3>
                      <p className="text-indigo-400">{pack.tickets} Tickets</p>
                    </div>
                    <div className="text-2xl font-black text-white">{pack.price}</div>
                  </div>
                  <form onSubmit={(e: any) => {
                    e.preventDefault();
                    addParticipant(e.target.pname.value, pack.id);
                    e.target.reset();
                  }}>
                    <div className="flex gap-2">
                      <input name="pname" placeholder="Votre Nom..." required className="flex-1 bg-black/30 border border-slate-600 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"/>
                      <button className="bg-white text-slate-900 font-bold px-6 rounded-xl hover:bg-indigo-50">GO</button>
                    </div>
                  </form>
                </div>
              ))}
              {packs.length === 0 && <p className="text-slate-500 italic">Aucun pack disponible.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // C. ÉCRAN ADMIN
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-indigo-500">ADMIN PANEL</h1>
        <button onClick={() => setView('GUEST')} className="text-sm font-bold bg-slate-800 px-4 py-2 rounded-lg">Quitter</button>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
        
        {/* COLONNE GAUCHE : CONFIG */}
        <div className="space-y-8">
          {/* GESTION PACKS */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold">📦 Packs Tickets</h2>
              <button onClick={createPack} className="text-xs bg-indigo-600 px-3 py-1 rounded font-bold">+ Ajouter</button>
            </div>
            {packs.map(p => (
              <div key={p.id} className="flex gap-2 mb-2 items-center">
                <input className="bg-slate-800 p-2 rounded w-1/3" defaultValue={p.name} onBlur={(e) => update(ref(db, `packs/${p.id}`), {name: e.target.value})}/>
                <input className="bg-slate-800 p-2 rounded w-20" defaultValue={p.price} onBlur={(e) => update(ref(db, `packs/${p.id}`), {price: e.target.value})}/>
                <input className="bg-slate-800 p-2 rounded w-16" type="number" defaultValue={p.tickets} onBlur={(e) => update(ref(db, `packs/${p.id}`), {tickets: e.target.value})}/>
                <button onClick={() => remove(ref(db, `packs/${p.id}`))} className="text-red-500 ml-auto"><Icon.Trash/></button>
              </div>
            ))}
          </div>

          {/* GESTION LOTS */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold">🏆 Lots à gagner</h2>
              <button onClick={createPrize} className="text-xs bg-emerald-600 px-3 py-1 rounded font-bold">+ Ajouter</button>
            </div>
            {prizes.map(p => (
              <div key={p.id} className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700">
                <div className="flex justify-between mb-2">
                  <input className="bg-transparent font-bold outline-none" defaultValue={p.name} onBlur={(e) => update(ref(db, `prizes/${p.id}`), {name: e.target.value})}/>
                  <button onClick={() => remove(ref(db, `prizes/${p.id}`))} className="text-red-500"><Icon.Trash/></button>
                </div>
                
                {/* Image Upload */}
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 bg-slate-900 rounded-lg overflow-hidden relative group">
                     {p.image ? <img src={p.image} className="w-full h-full object-cover"/> : <span className="text-[10px] p-1 block">Pas d'img</span>}
                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && handleImage(e.target.files[0], p.id)}/>
                  </div>
                  
                  {/* BOUTON DE TIRAGE */}
                  {!p.winner ? (
                    <button onClick={() => runDraw(p.id)} className="ml-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase px-4 py-2 rounded-lg">
                      Lancer Tirage
                    </button>
                  ) : (
                     <div className="ml-auto text-xs text-yellow-500 font-bold border border-yellow-500/30 px-3 py-1 rounded">
                       Gagné par {p.winner}
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLONNE DROITE : PARTICIPANTS */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col h-full max-h-screen">
          <div className="flex justify-between mb-4">
            <h2 className="font-bold">👥 Participants ({participants.length})</h2>
            <button onClick={() => confirm("Reset total ?") && remove(ref(db, 'participants'))} className="text-xs text-red-500 underline">Vider</button>
          </div>
          
          <div className="overflow-y-auto flex-1 space-y-2">
            {[...participants].reverse().map(p => (
              <div key={p.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl">
                <div>
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.packName}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-mono text-indigo-400 font-bold">{p.tickets} Tkt</div>
                  <button onClick={() => remove(ref(db, `participants/${p.id}`))} className="text-slate-600 hover:text-red-500"><Icon.Trash/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
