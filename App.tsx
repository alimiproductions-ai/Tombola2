import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, remove } from "firebase/database";

/**
 * --- 1. CONFIGURATION FIREBASE ---
 */
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ADMIN_PASSWORD = "nanah148";

/**
 * --- 2. ICÔNES SVG (Intégrées pour éviter les erreurs Vercel) ---
 */
const Icons = {
    Trophy: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
    Ticket: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>,
    Gift: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.9 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>,
    Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
    Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
    Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
    Exit: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
};

/**
 * --- 3. TYPES & DONNÉES ---
 */
interface TicketPackage { id: string; name: string; price: string; ticketCount: number; isBestValue?: boolean; }
interface Prize { id: string; name: string; description: string; imageUrl?: string; winnerId?: string; }
interface Participant { id?: string; name: string; packageId: string; totalTickets: number; date: number; }

const DEFAULT_PACKAGES = [
  { id: 'p1', name: 'Découverte', price: '26 ₪', ticketCount: 1, isBestValue: false },
  { id: 'p2', name: 'Chance Double', price: '52 ₪', ticketCount: 3, isBestValue: true },
  { id: 'p3', name: 'Gros Joueur', price: '100 ₪', ticketCount: 7, isBestValue: false }
];

/**
 * --- 4. COMPOSANT PRINCIPAL ---
 */
export default function App() {
  const [view, setView] = useState<'GUEST' | 'ADMIN' | 'DRAW'>('GUEST');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CONFIG'>('DASHBOARD');
  
  // États de données
  const [packages, setPackages] = useState<TicketPackage[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // États de Tirage
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinnerName, setCurrentWinnerName] = useState('');
  const [finalWinner, setFinalWinner] = useState<{name: string, prize: Prize} | null>(null);

  // Chargement des données au démarrage
  useEffect(() => {
    // Écoute Packs
    onValue(ref(db, 'packages'), (snapshot) => {
        const val = snapshot.val();
        if (val) {
            setPackages(Object.values(val)); // Conversion objet -> tableau
        } else {
            setPackages(DEFAULT_PACKAGES);
        }
    });

    // Écoute Prix
    onValue(ref(db, 'prizes'), (snapshot) => {
        const val = snapshot.val();
        setPrizes(val ? Object.values(val) : []);
    });

    // Écoute Participants
    onValue(ref(db, 'participants'), (snapshot) => {
        const val = snapshot.val();
        setPrizes(prevPrizes => { // Hack pour forcer le re-render si besoin
            return prevPrizes; 
        });
        setParticipants(val ? Object.entries(val).map(([k,v]:[string,any]) => ({id:k, ...v})) : []);
    });
  }, []);

  // --- ACTIONS PRINCIPALES (Réparées) ---

  // 1. Inscription d'un participant
  const handleRegister = async (name: string, pkg: TicketPackage) => {
      if (!name.trim()) return;
      try {
          const newParticipant = {
              name: name.trim(),
              packageId: pkg.id,
              totalTickets: Number(pkg.ticketCount), // Force le nombre
              date: Date.now()
          };
          
          await push(ref(db, 'participants'), newParticipant);
          alert(`✅ ${name} ajouté avec succès !`);
      } catch (e) {
          console.error(e);
          alert("Erreur lors de l'ajout. Vérifiez la console.");
      }
  };

  // 2. Lancement du Tirage
  const handleDraw = (prizeId: string) => {
    if (participants.length === 0) return alert("Aucun participant !");
    
    // Création du pool de tickets
    const pool: string[] = [];
    participants.forEach(p => {
        for(let i=0; i<p.totalTickets; i++) pool.push(p.name);
    });

    if(pool.length === 0) return alert("Aucun ticket valide trouvé.");

    setView('DRAW');
    setIsDrawing(true);
    
    // Animation
    let count = 0;
    const interval = setInterval(() => {
        setCurrentWinnerName(pool[Math.floor(Math.random() * pool.length)]);
        count++;
        if (count > 30) {
            clearInterval(interval);
            finishDraw(prizeId, pool);
        }
    }, 80);
  };

  const finishDraw = async (prizeId: string, pool: string[]) => {
    const winnerName = pool[Math.floor(Math.random() * pool.length)];
    const winner = participants.find(p => p.name === winnerName);
    const prize = prizes.find(p => p.id === prizeId);

    if (winner && prize) {
        // Mise à jour du lot gagné
        const updatedPrize = { ...prize, winnerId: winner.id };
        await set(ref(db, `prizes/${prize.id}`), updatedPrize);

        setIsDrawing(false);
        setFinalWinner({ name: winnerName, prize: prize });
    }
  };

  // --- GESTION DES IMAGES (Base64) ---
  const handleImageUpload = (file: File, prizeId: string) => {
      if (file.size > 1000000) return alert("L'image est trop lourde (max 1Mo)");
      
      const reader = new FileReader();
      reader.onloadend = () => {
          const base64String = reader.result as string;
          // Mise à jour directe de l'image du lot dans la DB
          const prize = prizes.find(p => p.id === prizeId);
          if(prize) {
             set(ref(db, `prizes/${prizeId}`), { ...prize, imageUrl: base64String });
          }
      };
      reader.readAsDataURL(file);
  };

  // --- VUES ---

  // VUE TIRAGE
  if (view === 'DRAW') {
    return (
        <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#0F172A] to-[#0F172A]"></div>
            
            {isDrawing ? (
                <div className="z-10 text-center space-y-12 animate-pulse">
                    <h1 className="text-4xl font-bold text-indigo-400 tracking-[0.5em] uppercase">Tirage en cours</h1>
                    <div className="text-6xl md:text-9xl font-black text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.3)]">
                        {currentWinnerName}
                    </div>
                </div>
            ) : finalWinner ? (
                <div className="z-10 text-center space-y-8 animate-in zoom-in duration-500 max-w-2xl w-full">
                    <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 drop-shadow-2xl">MAZAL TOV !</h1>
                    
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-[40px] shadow-2xl">
                        {finalWinner.prize.imageUrl && (
                            <img src={finalWinner.prize.imageUrl} alt="Prize" className="w-48 h-48 object-cover rounded-2xl mx-auto shadow-lg border-4 border-white/10 mb-8" />
                        )}
                        <p className="text-sm uppercase tracking-widest text-indigo-300 mb-2">Le grand gagnant est</p>
                        <p className="text-5xl font-black text-white mb-8">{finalWinner.name}</p>
                        <div className="bg-indigo-600/20 p-4 rounded-xl border border-indigo-500/30">
                            <p className="text-lg text-slate-300">Lot remporté : <span className="text-yellow-400 font-bold">{finalWinner.prize.name}</span></p>
                        </div>
                    </div>
                    
                    <button onClick={() => setView('ADMIN')} className="px-10 py-4 bg-white text-slate-900 rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-xl">
                        Retour au Panel
                    </button>
                </div>
            ) : null}
        </div>
    );
  }

  // VUE INVITÉ
  if (view === 'GUEST') {
    return (
        <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans selection:bg-indigo-500/30">
            <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
                <div className="text-2xl font-black tracking-tighter text-white">TOMBOLA<span className="text-indigo-500">.APP</span></div>
                <button onClick={() => { if(prompt("Mot de passe Admin ?") === ADMIN_PASSWORD) setView('ADMIN'); }} className="text-xs font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity">
                    Login
                </button>
            </nav>

            <header className="text-center py-16 px-4">
                <div className="inline-block px-4 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">Grande soirée 2026</div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight mb-6">
                    Tente ta chance.<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Gagne le gros lot.</span>
                </h1>
            </header>

            {/* LOTS */}
            <section className="max-w-7xl mx-auto px-6 py-12">
                <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2"><Icons.Trophy /> Les Lots à Gagner</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {prizes.map((prize) => (
                        <div key={prize.id} className="group relative bg-slate-800/50 rounded-3xl border border-slate-700/50 overflow-hidden hover:border-indigo-500/50 transition-all duration-300">
                            <div className="h-56 bg-slate-900 relative overflow-hidden">
                                {prize.imageUrl ? (
                                    <img src={prize.imageUrl} alt={prize.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-700"><Icons.Image /></div>
                                )}
                                {prize.winnerId && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                                        <div className="bg-yellow-500 text-black font-black px-6 py-2 rounded-full transform -rotate-12 shadow-xl">GAGNÉ !</div>
                                    </div>
                                )}
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-white mb-2">{prize.name}</h3>
                                <p className="text-sm text-slate-400 line-clamp-2">{prize.description}</p>
                            </div>
                        </div>
                    ))}
                    {prizes.length === 0 && <div className="text-slate-500 col-span-3 text-center py-10">Aucun lot configuré pour le moment.</div>}
                </div>
            </section>

            {/* OFFRES */}
            <section className="max-w-5xl mx-auto px-6 py-20">
                <h2 className="text-center text-3xl font-bold text-white mb-12">Choisis ton Pack</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    {packages.map((pkg) => (
                        <div key={pkg.id} className={`relative p-8 rounded-[40px] border flex flex-col items-center text-center transition-all duration-300 ${pkg.isBestValue ? 'bg-indigo-600 border-indigo-400 shadow-2xl shadow-indigo-900/50 scale-105 z-10' : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'}`}>
                            {pkg.isBestValue && <div className="absolute -top-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">Meilleure Offre</div>}
                            <h3 className={`text-xl font-bold mb-2 ${pkg.isBestValue ? 'text-white' : 'text-slate-300'}`}>{pkg.name}</h3>
                            <div className="text-4xl font-black text-white mb-1">{pkg.ticketCount} <span className="text-lg font-normal opacity-70">Tickets</span></div>
                            <div className={`text-2xl font-bold mb-8 ${pkg.isBestValue ? 'text-indigo-200' : 'text-indigo-400'}`}>{pkg.price}</div>
                            
                            <form className="w-full mt-auto" onSubmit={(e) => {
                                e.preventDefault();
                                const input = (e.target as any).elements.name;
                                handleRegister(input.value, pkg);
                                input.value = '';
                            }}>
                                <input name="name" type="text" placeholder="Ton Nom Complet..." className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 mb-3 focus:outline-none focus:bg-black/40 text-sm" required />
                                <button type="submit" className="w-full bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors uppercase text-xs tracking-widest">
                                    Acheter
                                </button>
                            </form>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="text-center py-12 text-slate-600 text-sm">© 2026 Tombola Event.</footer>
        </div>
    );
  }

  // VUE ADMIN
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row font-sans">
        <aside className="w-full md:w-64 border-r border-slate-800 p-4 flex flex-col gap-2 bg-slate-900/50">
            <div className="font-black text-xl mb-8 px-4 py-2 text-indigo-500 tracking-tight">ADMIN PANEL</div>
            <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}>
                <Icons.Ticket /> <span className="font-bold text-sm">Vente & Tirage</span>
            </button>
            <button onClick={() => setActiveTab('CONFIG')} className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'CONFIG' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}>
                <Icons.Gift /> <span className="font-bold text-sm">Gestion Lots/Prix</span>
            </button>
            <button onClick={() => setView('GUEST')} className="mt-auto flex items-center gap-3 p-4 rounded-xl text-slate-400 hover:text-white hover:bg-red-500/10 hover:text-red-400">
                <Icons.Exit /> <span className="text-xs font-bold uppercase">Quitter</span>
            </button>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
            {activeTab === 'DASHBOARD' && (
                <div className="max-w-6xl mx-auto space-y-8">
                    <header><h1 className="text-3xl font-bold text-white">Tableau de bord</h1></header>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* TIRAGES */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-emerald-400"><Icons.Trophy /> Lots à Tirer</h2>
                            <div className="space-y-3">
                                {prizes.filter(p => !p.winnerId).map(p => (
                                    <div key={p.id} className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
                                        <div className="flex items-center gap-4">
                                            {p.imageUrl && <img src={p.imageUrl} className="w-10 h-10 rounded-lg object-cover" />}
                                            <span className="font-bold text-sm">{p.name}</span>
                                        </div>
                                        <button onClick={() => handleDraw(p.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors">Tirer</button>
                                    </div>
                                ))}
                                {prizes.filter(p => !p.winnerId).length === 0 && <p className="text-slate-500 italic py-4 text-center">Tous les lots ont été gagnés !</p>}
                            </div>
                        </div>

                        {/* PARTICIPANTS */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                             <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-400"><Icons.Ticket /> Derniers Inscrits ({participants.length})</h2>
                             <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {[...participants].reverse().map(p => (
                                    <div key={p.id || Math.random()} className="flex justify-between items-center text-sm py-3 px-4 bg-slate-800/50 rounded-xl mb-2">
                                        <span className="font-medium text-slate-200">{p.name}</span>
                                        <span className="font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md text-xs font-bold">{p.totalTickets} tickets</span>
                                    </div>
                                ))}
                             </div>
                             <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                                 <span className="text-xs text-slate-500">Reset de la base de données ?</span>
                                 <button onClick={() => {if(confirm("SUPPRIMER TOUS LES PARTICIPANTS ?")) remove(ref(db, 'participants'))}} className="text-red-500 hover:bg-red-500/10 px-3 py-1 rounded-lg text-xs font-bold uppercase"><Icons.Trash /></button>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'CONFIG' && (
                <div className="max-w-4xl mx-auto space-y-12">
                    {/* GESTION PACKS */}
                    <section>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">📦 Offres Tickets</h2>
                            <button onClick={() => {
                                const newPkg = {id: crypto.randomUUID(), name: 'Nouveau', price: '0 ₪', ticketCount: 1, isBestValue: false};
                                set(ref(db, `packages/${newPkg.id}`), newPkg);
                            }} className="bg-indigo-600 p-2 rounded-lg hover:bg-indigo-500"><Icons.Plus /></button>
                        </div>
                        <div className="grid gap-4">
                            {packages.map((pkg) => (
                                <div key={pkg.id} className="flex flex-wrap gap-4 items-center bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg">
                                    <input defaultValue={pkg.name} onBlur={(e) => set(ref(db, `packages/${pkg.id}/name`), e.target.value)} className="bg-transparent border-b border-slate-700 p-2 w-1/3 outline-none focus:border-indigo-500 font-bold" placeholder="Nom" />
                                    <input defaultValue={pkg.price} onBlur={(e) => set(ref(db, `packages/${pkg.id}/price`), e.target.value)} className="bg-transparent border-b border-slate-700 p-2 w-20 outline-none focus:border-indigo-500" placeholder="Prix" />
                                    <div className="flex items-center gap-2">
                                        <input type="number" defaultValue={pkg.ticketCount} onBlur={(e) => set(ref(db, `packages/${pkg.id}/ticketCount`), parseInt(e.target.value))} className="bg-transparent border-b border-slate-700 p-2 w-16 outline-none text-center" />
                                        <span className="text-xs text-slate-500 uppercase">Tkts</span>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer ml-auto bg-slate-800 px-3 py-1 rounded-lg hover:bg-slate-700">
                                        <input type="checkbox" checked={pkg.isBestValue} onChange={(e) => set(ref(db, `packages/${pkg.id}/isBestValue`), e.target.checked)} className="accent-indigo-500" />
                                        <span className="text-xs text-slate-400">Star</span>
                                    </label>
                                    <button onClick={() => remove(ref(db, `packages/${pkg.id}`))} className="text-slate-600 hover:text-red-500 p-2"><Icons.Trash /></button>
                                </div>
                            ))}
                        </div>
                    </section>
                    
                    <div className="h-px bg-slate-800 w-full"></div>

                    {/* GESTION LOTS */}
                    <section>
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">🏆 Lots à Gagner</h2>
                            <button onClick={() => {
                                const newPrize = {id: crypto.randomUUID(), name: 'Nouveau Lot', description: 'Description...', imageUrl: ''};
                                set(ref(db, `prizes/${newPrize.id}`), newPrize);
                            }} className="bg-emerald-600 p-2 rounded-lg hover:bg-emerald-500"><Icons.Plus /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {prizes.map((prize) => (
                                <div key={prize.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 relative group shadow-lg">
                                    <button onClick={() => remove(ref(db, `prizes/${prize.id}`))} className="absolute top-4 right-4 text-slate-600 hover:text-red-500 bg-slate-950 p-2 rounded-lg z-10"><Icons.Trash /></button>
                                    
                                    {/* UPLOAD IMAGE */}
                                    <div className="mb-4">
                                        <div className="h-40 w-full bg-slate-950 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden relative group-hover:border-indigo-500/50 transition-colors">
                                            {prize.imageUrl ? (
                                                <img src={prize.imageUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-slate-600 flex flex-col items-center"><Icons.Image /> <span className="text-xs mt-2">Aucune image</span></div>
                                            )}
                                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-sm">
                                                <span className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold flex gap-2 items-center"><Icons.Upload /> Changer Image</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], prize.id)} />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <input defaultValue={prize.name} onBlur={(e) => set(ref(db, `prizes/${prize.id}/name`), e.target.value)} className="w-full bg-transparent border-b border-slate-700 p-2 font-bold text-lg outline-none focus:border-emerald-500 text-white placeholder-slate-600" placeholder="Nom du lot" />
                                        <textarea defaultValue={prize.description} onBlur={(e) => set(ref(db, `prizes/${prize.id}/description`), e.target.value)} className="w-full bg-slate-950/50 rounded-lg p-3 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500 resize-none border border-transparent focus:border-emerald-500/50" rows={2} placeholder="Description courte..." />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </main>
    </div>
  );
}
