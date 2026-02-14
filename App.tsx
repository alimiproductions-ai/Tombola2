
import React, { useState, useEffect, useMemo } from 'react';
import { AppView, AppRole, TicketPackage, Participant, Prize } from './types';
import { Icons, INITIAL_PACKAGES, INITIAL_PRIZES } from './constants';
import { getPrizeDescription, getWinnerCheer } from './services/gemini';
import { initFirebase, syncService } from './services/db';
import ConfettiEffect from './components/ConfettiEffect';

/**
 * 🛠️ ÉTAPE 1 : COLLE TA CONFIGURATION FIREBASE ICI !
 * Va dans console.firebase.google.com -> Paramètres projet -> Tes applications -> Web App.
 */
const firebaseConfig = {
  apiKey: "TON_API_KEY",
  authDomain: "TON_PROJET.firebaseapp.com",
  projectId: "TON_PROJET",
  storageBucket: "TON_PROJET.appspot.com",
  messagingSenderId: "TON_SENDER_ID",
  appId: "TON_APP_ID"
};

const ADMIN_PASSWORD = "admin"; // Change-le ici !

const App: React.FC = () => {
  // Roles & Access
  const [role, setRole] = useState<AppRole>('GUEST');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<AppView>('GUEST_REGISTER');

  // Cloud States (Synchronisés avec Firebase)
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
    // Si tu n'as pas encore mis ta config, on ne fait rien
    if (firebaseConfig.apiKey === "TON_API_KEY") {
        console.warn("⚠️ Firebase non configuré ! L'app fonctionne en mode local simulation.");
        return;
    }
    
    initFirebase(firebaseConfig);

    // Écoute en temps réel des changements sur tous les appareils
    const unsubPkg = syncService.subscribeToSettings('packages', (data) => data && setPackages(data));
    const unsubPrize = syncService.subscribeToSettings('prizes', (data) => data && setPrizes(data));
    const unsubPart = syncService.subscribeToParticipants(setParticipants);

    return () => { unsubPkg(); unsubPrize(); unsubPart(); };
  }, []);

  const totalTickets = useMemo(() => 
    participants.reduce((sum, p) => sum + p.totalTickets, 0), 
  [participants]);

  // Handlers pour Firebase
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
      <div className="min-h-screen flex flex-col p-6 items-center justify-center space-y-12 animate-in fade-in duration-700">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bangers text-yellow-500 tracking-widest drop-shadow-2xl">TOMBOLA PARTY</h1>
          <div className="bg-white/10 backdrop-blur px-6 py-2 rounded-full border border-white/20 inline-block">
            <p className="text-indigo-200 font-black uppercase text-xs tracking-widest">✨ Inscris-toi maintenant ! ✨</p>
          </div>
        </div>
        
        <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <h2 className="text-xl font-bold mb-8 text-center text-white/90">Tes informations</h2>
          <ParticipantForm packages={packages} onAdd={addParticipant} />
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="bg-slate-900/60 p-6 rounded-3xl text-center border border-white/5">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Inscriptions</p>
                <p className="text-3xl font-bangers text-indigo-400">{participants.length}</p>
            </div>
            <div className="bg-slate-900/60 p-6 rounded-3xl text-center border border-white/5">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Lots à gagner</p>
                <p className="text-3xl font-bangers text-emerald-400">{prizes.length}</p>
            </div>
        </div>

        <button onClick={handleLogin} className="text-slate-600 text-[10px] hover:text-slate-400 transition-colors uppercase font-black tracking-widest mt-12">Accès Admin</button>
      </div>
    );
  }

  // --- RENDU INTERFACE ADMIN ---
  return (
    <div className="flex flex-col md:flex-row min-h-screen selection:bg-indigo-500/30">
      {/* Barre de navigation Admin (Mobile bas / Desktop côté) */}
      <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-72 bg-slate-900/80 backdrop-blur-xl border-t md:border-t-0 md:border-r border-slate-700 p-4 flex md:flex-col justify-around md:justify-start gap-4 z-50 shadow-2xl">
        <div className="hidden md:block mb-12 px-4 py-8">
          <h1 className="text-3xl font-bangers text-yellow-500 tracking-wider">PANEL ADMIN</h1>
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
            className={`flex flex-col md:flex-row items-center gap-4 px-6 py-4 rounded-2xl transition-all ${view === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 scale-105' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
          >
            <item.icon />
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
        
        <button onClick={() => { setRole('GUEST'); setView('GUEST_REGISTER'); setIsAuthenticated(false); }} className="mt-auto hidden md:flex items-center gap-4 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-black uppercase text-xs tracking-widest">
            <Icons.Trash /> Déconnexion
        </button>
      </nav>
      
      <main className="flex-1 p-4 md:p-12 pb-32 md:pb-12 overflow-y-auto">
        {view === 'DASHBOARD' && (
          <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-5xl font-extrabold text-white tracking-tighter">Tableau de bord</h2>
                  <p className="text-slate-400 mt-2">Le cœur de votre événement en temps réel.</p>
                </div>
                <button 
                  onClick={() => setShowQr(!showQr)} 
                  className="bg-white/5 hover:bg-white/10 px-8 py-4 rounded-2xl border border-white/10 transition-all flex items-center gap-3 group"
                >
                    <span className="text-xs font-black uppercase tracking-widest">Partager l'accès</span>
                    <div className="p-2 bg-indigo-500/20 rounded-lg group-hover:bg-indigo-500/40 transition-all"><Icons.Plus /></div>
                </button>
            </header>

            {showQr && (
                <div className="bg-white p-10 rounded-[50px] text-black text-center space-y-6 animate-in zoom-in duration-300 shadow-[0_30px_100px_rgba(255,255,255,0.1)]">
                    <p className="font-black text-sm uppercase tracking-widest text-slate-400">Invitez vos participants</p>
                    <div className="bg-slate-100 w-56 h-56 mx-auto rounded-[30px] flex items-center justify-center border-8 border-slate-50">
                        <div className="p-4 bg-white rounded-xl shadow-inner">
                          <p className="text-[10px] text-slate-300 font-black uppercase">Généré par Cloud</p>
                          <div className="w-32 h-32 bg-slate-900 rounded-lg mt-2 flex items-center justify-center text-white text-xs">QR</div>
                        </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-slate-800">Lien direct :</p>
                      <code className="bg-slate-100 px-4 py-2 rounded-full text-xs text-indigo-600 font-bold block truncate">{window.location.href}</code>
                    </div>
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Formulaire de vente Admin */}
              <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[40px] p-8 shadow-2xl">
                <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-indigo-300 uppercase tracking-widest">
                  <div className="p-3 bg-indigo-500/20 rounded-2xl"><Icons.Ticket /></div>
                  Vente rapide (Admin)
                </h3>
                <ParticipantForm packages={packages} onAdd={addParticipant} />
              </div>

              {/* Liste des Tirages */}
              <div className="bg-slate-800/20 border border-slate-700/50 rounded-[40px] p-8">
                <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-emerald-300 uppercase tracking-widest">
                  <div className="p-3 bg-emerald-500/20 rounded-2xl"><Icons.Trophy /></div>
                  Tirages Disponibles
                </h3>
                <div className="space-y-4">
                  {prizes.filter(p => !p.winnerId).map(prize => (
                    <div key={prize.id} className="flex items-center justify-between p-6 bg-slate-900/60 rounded-3xl border border-slate-700 group hover:border-indigo-500/50 transition-all shadow-lg">
                      <div>
                        <p className="font-bold text-lg text-white">{prize.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">{prize.description}</p>
                      </div>
                      <button onClick={() => startDraw(prize.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all active:scale-90">Tirer</button>
                    </div>
                  ))}
                  {prizes.every(p => p.winnerId) && prizes.length > 0 && <p className="text-center text-slate-500 py-12 italic text-sm">Bravo ! Tous les lots ont trouvé preneur. 🎊</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'SETTINGS' && (
           <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
              <header className="flex justify-between items-center">
                <h2 className="text-4xl font-extrabold">Configuration</h2>
                <button onClick={async () => { if(confirm("🚨 RESET TOTAL ? Cela videra la base de données cloud (participants et gagnants).")) { await syncService.clearAllParticipants(); window.location.reload(); } }} className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">Reset Session Cloud</button>
              </header>

              {/* GESTION DES PACKS */}
              <section className="space-y-6">
                <div className="flex justify-between items-center bg-indigo-500/5 p-6 rounded-3xl border border-indigo-500/10">
                    <h3 className="text-xl font-black text-indigo-300 uppercase tracking-widest">Offres de Tickets</h3>
                    <button onClick={() => { const p = {id: crypto.randomUUID(), name: 'Nouveau Pack', description: '0 ₪', ticketCount: 1}; updatePackages([...packages, p]); setEditingPackage(p); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Icons.Plus /> Ajouter</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {packages.map(pkg => (
                        <div key={pkg.id} className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-[40px] relative group hover:bg-slate-800/60 transition-all shadow-xl">
                            <div className="absolute top-6 right-6 flex gap-2">
                                <button onClick={() => setEditingPackage(pkg)} className="p-3 bg-slate-900 rounded-xl hover:text-indigo-400 transition-colors shadow-lg"><Icons.Edit /></button>
                                <button onClick={() => updatePackages(packages.filter(p => p.id !== pkg.id))} className="p-3 bg-slate-900 rounded-xl hover:text-red-400 transition-colors shadow-lg"><Icons.Trash /></button>
                            </div>
                            <h4 className="font-bold text-xl text-white pr-20">{pkg.name}</h4>
                            <p className="text-slate-500 text-xs mt-2 uppercase font-black tracking-widest">{pkg.description}</p>
                            <div className="mt-8 flex items-baseline gap-2">
                              <p className="text-6xl font-bangers text-indigo-400">{pkg.ticketCount}</p>
                              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Tickets</span>
                            </div>
                        </div>
                    ))}
                </div>
              </section>

              {/* GESTION DES LOTS */}
              <section className="space-y-6">
                 <div className="flex justify-between items-center bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/10">
                    <h3 className="text-xl font-black text-emerald-300 uppercase tracking-widest">Lots en Jeu</h3>
                    <button onClick={() => { const p = {id: crypto.randomUUID(), name: 'Nouveau Lot', description: '...', order: prizes.length+1}; updatePrizes([...prizes, p]); setEditingPrize(p); }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Icons.Plus /> Ajouter</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {prizes.map(prize => (
                        <div key={prize.id} className={`p-8 rounded-[40px] border transition-all flex flex-col justify-between group relative shadow-2xl ${prize.winnerId ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-800/40 border-slate-700/50'}`}>
                            <div className="absolute top-8 right-8 flex gap-2">
                                <button onClick={() => setEditingPrize(prize)} className="p-3 bg-slate-900 rounded-xl hover:text-emerald-400 transition-colors shadow-lg"><Icons.Edit /></button>
                                <button onClick={() => updatePrizes(prizes.filter(p => p.id !== prize.id))} className="p-3 bg-slate-900 rounded-xl hover:text-red-400 transition-colors shadow-lg"><Icons.Trash /></button>
                            </div>
                            <h4 className="text-2xl font-bold text-white pr-24">{prize.name}</h4>
                            <p className="text-slate-500 text-sm italic mt-4 mb-8 line-clamp-2">"{prize.description}"</p>
                            {prize.winnerId && (
                              <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">🏆 Remporté par :</span>
                                <span className="text-lg font-bangers text-white">{participants.find(p => p.id === prize.winnerId)?.name}</span>
                              </div>
                            )}
                        </div>
                    ))}
                 </div>
              </section>
           </div>
        )}

        {/* MODAL EDITION PACK */}
        {editingPackage && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
             <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-[40px] p-10 space-y-8 shadow-[0_0_100px_rgba(0,0,0,1)]">
                <h3 className="text-3xl font-bangers text-white tracking-widest text-center">Modifier le Pack</h3>
                <div className="space-y-4">
                   <input type="text" value={editingPackage.name} onChange={e => setEditingPackage({...editingPackage, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nom du pack" />
                   <input type="text" value={editingPackage.description} onChange={e => setEditingPackage({...editingPackage, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Valeur (ex: 50 ₪)" />
                   <input type="number" value={editingPackage.ticketCount} onChange={e => setEditingPackage({...editingPackage, ticketCount: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nombre de tickets" />
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setEditingPackage(null)} className="flex-1 py-5 bg-slate-800 text-slate-400 font-black uppercase tracking-widest rounded-2xl">Annuler</button>
                   <button onClick={() => { updatePackages(packages.map(p => p.id === editingPackage.id ? editingPackage : p)); setEditingPackage(null); }} className="flex-1 py-5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/30">Enregistrer</button>
                </div>
             </div>
          </div>
        )}

        {/* MODAL EDITION LOT */}
        {editingPrize && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
             <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-[40px] p-10 space-y-8 shadow-[0_0_100px_rgba(0,0,0,1)]">
                <h3 className="text-3xl font-bangers text-white tracking-widest text-center">Modifier le Lot</h3>
                <div className="space-y-4">
                   <input type="text" value={editingPrize.name} onChange={e => setEditingPrize({...editingPrize, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nom du lot" />
                   <textarea rows={3} value={editingPrize.description} onChange={e => setEditingPrize({...editingPrize, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Description du lot..." />
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setEditingPrize(null)} className="flex-1 py-5 bg-slate-800 text-slate-400 font-black uppercase tracking-widest rounded-2xl">Annuler</button>
                   <button onClick={() => { updatePrizes(prizes.map(p => p.id === editingPrize.id ? editingPrize : p)); setEditingPrize(null); }} className="flex-1 py-5 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-600/30">Enregistrer</button>
                </div>
             </div>
          </div>
        )}

        {view === 'PARTICIPANTS' && (
            <div className="max-w-5xl mx-auto animate-in fade-in duration-500 space-y-12">
                <h2 className="text-5xl font-extrabold text-white">Participants <span className="text-indigo-500">({participants.length})</span></h2>
                <div className="bg-slate-900/40 border border-slate-700/50 rounded-[40px] overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-10 py-8">Nom</th>
                                <th className="px-10 py-8">Offre Choisie</th>
                                <th className="px-10 py-8 text-center">Tkt</th>
                                <th className="px-10 py-8 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {participants.map(p => (
                                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-10 py-8 font-bold text-slate-200 text-lg">{p.name}</td>
                                    <td className="px-10 py-8">
                                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-full font-black uppercase tracking-widest">
                                        {packages.find(pk => pk.id === p.packageId)?.name || 'Pack Spécial'}
                                      </span>
                                    </td>
                                    <td className="px-10 py-8 text-center font-bangers text-4xl text-white drop-shadow-lg">{p.totalTickets}</td>
                                    <td className="px-10 py-8 text-right">
                                      <button onClick={() => syncService.deleteParticipant(p.id!)} className="text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 p-3 bg-slate-900 rounded-xl">
                                        <Icons.Trash />
                                      </button>
                                    </td>
                                </tr>
                            ))}
                            {participants.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-32 text-slate-600 italic text-xl">Aucune vente enregistrée. 🎟️</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {view === 'DRAW' && (
          <div className="fixed inset-0 z-[100] bg-[#050515] flex items-center justify-center p-6 text-center overflow-hidden">
             <div className="max-w-4xl w-full relative">
                <div className="absolute inset-0 bg-indigo-500/10 blur-[200px] animate-pulse rounded-full"></div>
                {isDrawing ? (
                   <div className="space-y-16 animate-pulse relative z-10">
                      <h2 className="text-3xl font-black text-indigo-500/50 uppercase tracking-[0.8em] animate-bounce">Extraction en cours...</h2>
                      <div className="h-64 flex items-center justify-center">
                        <span className="text-8xl md:text-[14rem] font-bangers text-yellow-500 drop-shadow-[0_0_60px_rgba(234,179,8,0.6)] animate-in zoom-in">{tempWinnerName}</span>
                      </div>
                   </div>
                ) : lastWinner ? (
                   <div className="space-y-12 animate-in zoom-in duration-700 relative z-10">
                      <ConfettiEffect />
                      <div className="space-y-4">
                        <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-sm">Le sort a parlé !</p>
                        <h2 className="text-7xl md:text-[10rem] font-bangers text-white leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                          MAZAL TOV <br/><span className="text-yellow-400 drop-shadow-[0_0_40px_rgba(234,179,8,0.5)]">{lastWinner.name}</span> !
                        </h2>
                      </div>
                      <div className="bg-slate-900/80 backdrop-blur-2xl p-12 rounded-[60px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] max-w-2xl mx-auto transform hover:scale-105 transition-transform">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">Gagne le lot :</p>
                        <p className="text-4xl md:text-5xl font-black text-indigo-400 mb-10 leading-tight">{lastWinner.prize}</p>
                        <div className="h-px bg-white/5 w-32 mx-auto mb-10"></div>
                        <p className="text-2xl text-slate-200 italic leading-relaxed font-medium">"{lastWinner.message}"</p>
                      </div>
                      <button 
                        onClick={() => setView('DASHBOARD')} 
                        className="bg-white text-indigo-950 font-black px-20 py-8 rounded-full hover:scale-110 transition-all uppercase tracking-widest text-xl shadow-[0_20px_50px_rgba(255,255,255,0.2)]"
                      >
                        Continuer la fête
                      </button>
                   </div>
                ) : null}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- COMPOSANTS INTERNES ---

const ParticipantForm: React.FC<{ packages: TicketPackage[], onAdd: (name: string, packageId: string) => void }> = ({ packages, onAdd }) => {
  const [name, setName] = useState('');
  const [pkgId, setPkgId] = useState('');
  useEffect(() => { if (!pkgId && packages.length > 0) setPkgId(packages[0].id); }, [packages]);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (name && pkgId) { onAdd(name, pkgId); setName(''); } };
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-3">
        <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest ml-4">Ton Nom et Prénom</label>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Ex: David Cohen" 
          className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-6 text-white text-xl focus:ring-4 focus:ring-indigo-500/20 outline-none font-bold shadow-inner transition-all placeholder:text-slate-800" 
          required 
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest ml-4">Choisis ton Pack</label>
        <div className="relative group">
          <select 
            value={pkgId} 
            onChange={(e) => setPkgId(e.target.value)} 
            className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-6 text-white text-lg focus:ring-4 focus:ring-indigo-500/20 outline-none font-bold appearance-none shadow-inner transition-all"
          >
              {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.ticketCount} tkt • {p.description})</option>)}
          </select>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>
      <button 
        type="submit" 
        disabled={packages.length === 0} 
        className="w-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black py-8 rounded-[30px] shadow-2xl hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] uppercase tracking-[0.2em] text-sm border-t border-white/10 transition-all flex items-center justify-center gap-4"
      >
        <Icons.Ticket /> Participer au Tirage
      </button>
    </form>
  );
};

export default App;
