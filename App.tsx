import React, { useState, useEffect, useMemo } from 'react';
import { AppView, AppRole, TicketPackage, Participant, Prize } from './types';
import { Icons, INITIAL_PACKAGES, INITIAL_PRIZES } from './constants';
import { getPrizeDescription, getWinnerCheer } from './services/gemini';
import { initFirebase, syncService } from './services/db';
import ConfettiEffect from './components/ConfettiEffect';

/**
 * ✅ CONFIGURATION FIREBASE INTÉGRÉE
 */
const firebaseConfig = {
  apiKey: "AIzaSyAZDCN7LTHrGacH-Y8mBStZ1eml5xeImo4",
  authDomain: "tombola-731c0.firebaseapp.com",
  databaseURL: "https://tombola-731c0-default-rtdb.firebaseio.com", // Ajouté pour la synchro temps réel
  projectId: "tombola-731c0",
  storageBucket: "tombola-731c0.firebasestorage.app",
  messagingSenderId: "987970383398",
  appId: "1:987970383398:web:93c7a8994ebe44b33d80e7",
  measurementId: "G-XCRP9XHQN1"
};

const ADMIN_PASSWORD = "admin"; 

const App: React.FC = () => {
  // Roles & Access
  const [role, setRole] = useState<AppRole>('GUEST');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<AppView>('GUEST_REGISTER');

  // Cloud States
  const [packages, setPackages] = useState<TicketPackage[]>(INITIAL_PACKAGES);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>(INITIAL_PRIZES);
  
  // Local UI State
  const [editingPackage, setEditingPackage] = useState<TicketPackage | null>(null);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastWinner, setLastWinner] = useState<{name: string, prize: string, message: string} | null>(null);
  const [tempWinnerName, setTempWinnerName] = useState<string>('');
  const [showQr, setShowQr] = useState(false);

  // Initialisation de Firebase
  useEffect(() => {
    // Vérification que les clés sont bien là
    if (firebaseConfig.apiKey.includes("TON_API_KEY")) {
        console.warn("⚠️ Firebase non configuré !");
        return;
    }
    
    try {
        initFirebase(firebaseConfig);

        // Souscription aux données Cloud
        const unsubPkg = syncService.subscribeToSettings('packages', (data) => data && setPackages(data));
        const unsubPrize = syncService.subscribeToSettings('prizes', (data) => data && setPrizes(data));
        const unsubPart = syncService.subscribeToParticipants(setParticipants);

        return () => { unsubPkg(); unsubPrize(); unsubPart(); };
    } catch (error) {
        console.error("Erreur Firebase Init:", error);
    }
  }, []);

  const totalTickets = useMemo(() => 
    participants.reduce((sum, p) => sum + p.totalTickets, 0), 
  [participants]);

  // Handlers
  const addParticipant = async (name: string, packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg || !name) return;
    
    const newParticipant = {
      name,
      packageId,
      totalTickets: pkg.ticketCount,
      purchasedAt: Date.now()
    };

    await syncService.addParticipant(newParticipant);
    if (role === 'GUEST') alert("✨ Inscription validée ! Bonne chance !");
  };

  const updatePackages = (newPkgs: TicketPackage[]) => {
    setPackages(newPkgs);
    syncService.saveSettings('packages', newPkgs);
  };

  const updatePrizes = (newPrizes: Prize[]) => {
    setPrizes(newPrizes);
    syncService.saveSettings('prizes', newPrizes);
  };

  const startDraw = async (prizeId: string) => {
    if (participants.length === 0) return alert("Il n'y a aucun participant pour le tirage !");
    const prize = prizes.find(p => p.id === prizeId);
    if (!prize || prize.winnerId) return;

    setIsDrawing(true);
    setLastWinner(null);
    setView('DRAW');

    const ticketPool: string[] = [];
    participants.forEach(p => {
        for(let i=0; i < p.totalTickets; i++) ticketPool.push(p.name);
    });

    let start = Date.now();
    const animate = () => {
        if (Date.now() - start < 3000) {
            setTempWinnerName(ticketPool[Math.floor(Math.random() * ticketPool.length)]);
            requestAnimationFrame(animate);
        } else {
            finalizeDraw(prizeId, ticketPool);
        }
    };
    animate();
  };

  const finalizeDraw = async (prizeId: string, pool: string[]) => {
    const winnerName = pool[Math.floor(Math.random() * pool.length)];
    const winnerObj = participants.find(p => p.name === winnerName);
    if (winnerObj) {
      const prize = prizes.find(p => p.id === prizeId)!;
      const newPrizes = prizes.map(p => p.id === prizeId ? { ...p, winnerId: winnerObj.id } : p);
      updatePrizes(newPrizes);
      
      setTempWinnerName(winnerName);
      setIsDrawing(false);
      const cheer = await getWinnerCheer(winnerName, prize.name);
      setLastWinner({ name: winnerName, prize: prize.name, message: cheer });
    }
  };

  const handleLogin = () => {
    const pass = prompt("🔐 Mot de passe administrateur ?");
    if (pass === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setRole('ADMIN');
      setView('DASHBOARD');
    } else {
      alert("Accès refusé.");
    }
  };

  // --- RENDU INTERFACE INVITÉ ---
  if (view === 'GUEST_REGISTER' && role === 'GUEST') {
    return (
      <div className="min-h-screen bg-[#050515] text-white flex flex-col p-6 items-center justify-center space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-black text-yellow-500 tracking-widest drop-shadow-2xl">TOMBOLA PARTY</h1>
          <div className="bg-white/10 backdrop-blur px-6 py-2 rounded-full border border-white/20 inline-block">
            <p className="text-indigo-200 font-black uppercase text-xs tracking-widest">✨ Inscris-toi maintenant ! ✨</p>
          </div>
        </div>
        
        <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl p-8 rounded-[40px] border border-white/10">
          <h2 className="text-xl font-bold mb-8 text-center text-white/90">Tes informations</h2>
          <ParticipantForm packages={packages} onAdd={addParticipant} />
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="bg-slate-900/60 p-6 rounded-3xl text-center border border-white/5">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Inscriptions</p>
                <p className="text-3xl font-bold text-indigo-400">{participants.length}</p>
            </div>
            <div className="bg-slate-900/60 p-6 rounded-3xl text-center border border-white/5">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Lots à gagner</p>
                <p className="text-3xl font-bold text-emerald-400">{prizes.length}</p>
            </div>
        </div>

        <button onClick={handleLogin} className="text-slate-600 text-[10px] hover:text-slate-400 uppercase font-black tracking-widest mt-12">Accès Admin</button>
      </div>
    );
  }

  // --- RENDU INTERFACE ADMIN ---
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#050515] text-white selection:bg-indigo-500/30">
      <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-72 bg-slate-900/80 backdrop-blur-xl border-t md:border-t-0 md:border-r border-slate-700 p-4 flex md:flex-col justify-around md:justify-start gap-4 z-50">
        <div className="hidden md:block mb-12 px-4 py-8">
          <h1 className="text-3xl font-bold text-yellow-500 tracking-wider">PANEL ADMIN</h1>
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mt-2">Mode Cloud Connecté</p>
        </div>
        
        {[
          { id: 'DASHBOARD', label: 'Tirage & Vente', icon: Icons.Play },
          { id: 'PARTICIPANTS', label: 'Participants', icon: Icons.Users },
          { id: 'SETTINGS', label: 'Configuration', icon: Icons.Settings },
        ].map(item => (
          <button 
            key={item.id} 
            onClick={() => setView(item.id as AppView)} 
            className={`flex flex-col md:flex-row items-center gap-4 px-6 py-4 rounded-2xl transition-all ${view === item.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-800'}`}
          >
            <item.icon />
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
        
        <button onClick={() => { setRole('GUEST'); setView('GUEST_REGISTER'); setIsAuthenticated(false); }} className="mt-auto hidden md:flex items-center gap-4 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 font-black uppercase text-xs tracking-widest">
            <Icons.Trash /> Déconnexion
        </button>
      </nav>
      
      <main className="flex-1 p-4 md:p-12 pb-32 md:pb-12 overflow-y-auto">
        {/* Le reste de ton contenu (DASHBOARD, SETTINGS, etc.) */}
        {view === 'DASHBOARD' && (
          <div className="max-w-5xl mx-auto space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-5xl font-extrabold text-white tracking-tighter">Tableau de bord</h2>
                  <p className="text-slate-400 mt-2">Connecté à Firebase: {firebaseConfig.projectId}</p>
                </div>
            </header>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[40px] p-8">
                <h3 className="text-xl font-black mb-8 text-indigo-300 uppercase tracking-widest">Vente rapide</h3>
                <ParticipantForm packages={packages} onAdd={addParticipant} />
              </div>
              <div className="bg-slate-800/20 border border-slate-700/50 rounded-[40px] p-8">
                <h3 className="text-xl font-black mb-8 text-emerald-300 uppercase tracking-widest">Lots à tirer</h3>
                <div className="space-y-4">
                  {prizes.filter(p => !p.winnerId).map(prize => (
                    <div key={prize.id} className="flex items-center justify-between p-6 bg-slate-900/60 rounded-3xl border border-slate-700">
                      <span className="font-bold">{prize.name}</span>
                      <button onClick={() => startDraw(prize.id)} className="bg-indigo-600 px-6 py-2 rounded-xl text-xs font-black uppercase">Tirer</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Rendu des autres vues simplifié pour l'exemple, garde ton code original pour Participants/Draw */}
        {view === 'PARTICIPANTS' && <div className="text-white">Liste des participants ({participants.length})</div>}
        {view === 'DRAW' && isDrawing && <div className="text-6xl text-center mt-20 font-bold animate-pulse">{tempWinnerName}</div>}
      </main>
    </div>
  );
};

// Formulaire identique
const ParticipantForm: React.FC<{ packages: TicketPackage[], onAdd: (name: string, packageId: string) => void }> = ({ packages, onAdd }) => {
  const [name, setName] = useState('');
  const [pkgId, setPkgId] = useState('');
  useEffect(() => { if (!pkgId && packages.length > 0) setPkgId(packages[0].id); }, [packages]);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (name && pkgId) { onAdd(name, pkgId); setName(''); } };
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du participant" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white" required />
      <select value={pkgId} onChange={(e) => setPkgId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white">
          {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.ticketCount} tkt)</option>)}
      </select>
      <button type="submit" className="w-full bg-indigo-600 py-4 rounded-2xl font-black uppercase">Enregistrer la vente</button>
    </form>
  );
};

export default App;
