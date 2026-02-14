import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, remove } from "firebase/database";
import { Trash2, Edit, Plus, Image as ImageIcon, Upload, Gift, Ticket, Trophy } from 'lucide-react';

// --- 1. CONFIGURATION FIREBASE (Tes clés sont déjà là) ---
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

// --- 2. TYPES ---
interface TicketPackage { id: string; name: string; price: string; ticketCount: number; isBestValue?: boolean; }
interface Prize { id: string; name: string; description: string; imageUrl?: string; winnerId?: string; }
interface Participant { id?: string; name: string; packageId: string; totalTickets: number; date: number; }

const ADMIN_PASSWORD = "admin";

// Données par défaut si la DB est vide
const DEFAULT_PACKAGES = [
  { id: 'p1', name: 'Découverte', price: '26 ₪', ticketCount: 1, isBestValue: false },
  { id: 'p2', name: 'Chance Double', price: '52 ₪', ticketCount: 3, isBestValue: true }, // Best value
  { id: 'p3', name: 'Gros Joueur', price: '100 ₪', ticketCount: 7, isBestValue: false }
];

// --- 3. SERVICE DB ---
const dbService = {
  subscribe: (path: string, callback: (val: any) => void) => {
    return onValue(ref(db, path), (snapshot) => {
      const val = snapshot.val();
      if (val && typeof val === 'object') {
         // Convertit l'objet Firebase en tableau propre
         const list = Object.entries(val).map(([k, v]: [string, any]) => ({ id: k, ...v }));
         callback(list);
      } else {
         callback([]);
      }
    });
  },
  save: async (path: string, data: any) => set(ref(db, path), data), // Ecrase ou crée
  remove: async (path: string) => remove(ref(db, path))
};

// --- 4. COMPOSANT APP PRINCIPAL ---
export default function App() {
  const [view, setView] = useState<'GUEST' | 'ADMIN' | 'DRAW'>('GUEST');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CONFIG'>('DASHBOARD'); // Pour l'admin
  
  // Data States
  const [packages, setPackages] = useState<TicketPackage[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // Drawing States
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinnerName, setCurrentWinnerName] = useState('');
  const [finalWinner, setFinalWinner] = useState<{name: string, prize: Prize} | null>(null);

  // Initialisation
  useEffect(() => {
    dbService.subscribe('packages', (data) => setPackages(data.length ? data : DEFAULT_PACKAGES));
    dbService.subscribe('prizes', (data) => setPrizes(data));
    dbService.subscribe('participants', (data) => setParticipants(data));
  }, []);

  // --- LOGIQUE METIER ---

  const handleDraw = (prizeId: string) => {
    if (participants.length === 0) return alert("Aucun participant !");
    
    // Création du pool de tickets pondéré
    const pool: string[] = [];
    participants.forEach(p => {
        for(let i=0; i<p.totalTickets; i++) pool.push(p.name);
    });

    setView('DRAW');
    setIsDrawing(true);
    
    // Animation
    let count = 0;
    const interval = setInterval(() => {
        setCurrentWinnerName(pool[Math.floor(Math.random() * pool.length)]);
        count++;
        if (count > 25) {
            clearInterval(interval);
            finalizeDraw(prizeId, pool);
        }
    }, 100);
  };

  const finalizeDraw = (prizeId: string, pool: string[]) => {
    const winnerName = pool[Math.floor(Math.random() * pool.length)];
    const winner = participants.find(p => p.name === winnerName);
    const prize = prizes.find(p => p.id === prizeId);

    if (winner && prize) {
        // Mise à jour en DB
        const updatedPrizes = prizes.map(p => p.id === prizeId ? {...p, winnerId: winner.id} : p);
        // On sauve sous forme d'objet indexé par ID pour éviter les bugs de tableau Firebase
        const prizesObj = updatedPrizes.reduce((acc, p) => ({...acc, [p.id]: p}), {});
        dbService.save('prizes', prizesObj);

        setIsDrawing(false);
        setFinalWinner({ name: winnerName, prize: prize });
    }
  };

  // --- VUE : TIRAGE (DRAW) ---
  if (view === 'DRAW') {
    return (
        <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-[#0F172A] to-[#0F172A]"></div>
            
            {isDrawing ? (
                <div className="z-10 text-center space-y-10">
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 animate-pulse">LE SORT EN EST JETÉ...</h1>
                    <div className="text-5xl md:text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                        {currentWinnerName}
                    </div>
                </div>
            ) : finalWinner ? (
                <div className="z-10 text-center space-y-8 animate-in zoom-in duration-500">
                    <h1 className="text-6xl md:text-8xl font-black text-yellow-400 drop-shadow-2xl">MAZAL TOV !</h1>
                    
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[40px] max-w-2xl mx-auto shadow-2xl">
                        <div className="mb-6">
                            {finalWinner.prize.imageUrl && (
                                <img src={finalWinner.prize.imageUrl} alt="Prize" className="w-48 h-48 object-cover rounded-2xl mx-auto shadow-lg border-4 border-white/10" />
                            )}
                        </div>
                        <p className="text-xl uppercase tracking-widest text-indigo-300 mb-2">Le gagnant est</p>
                        <p className="text-5xl font-bold text-white mb-6">{finalWinner.name}</p>
                        <div className="h-px w-32 bg-white/20 mx-auto mb-6"></div>
                        <p className="text-xl text-slate-300">Remporte : <span className="text-yellow-400 font-bold">{finalWinner.prize.name}</span></p>
                    </div>
                    
                    <button onClick={() => setView('ADMIN')} className="px-10 py-4 bg-white text-slate-900 rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                        Retour au Panel
                    </button>
                </div>
            ) : null}
        </div>
    );
  }

  // --- VUE : INVITÉ (USER UX) ---
  if (view === 'GUEST') {
    return (
        <div className="min-h-screen bg-[#0F172A] text-slate-200 selection:bg-indigo-500/30 font-sans">
            {/* Navbar simple */}
            <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
                <div className="text-2xl font-black tracking-tighter text-white">TOMBOLA<span className="text-indigo-500">.APP</span></div>
                <button onClick={() => { if(prompt("Admin Password?") === ADMIN_PASSWORD) setView('ADMIN'); }} className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">Login</button>
            </nav>

            {/* Hero Section */}
            <header className="text-center py-12 px-4 space-y-6">
                <div className="inline-block px-4 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">Grande soirée 2026</div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight">
                    Tente ta chance.<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Gagne le gros lot.</span>
                </h1>
                <p className="max-w-xl mx-auto text-slate-400 text-lg">Inscris-toi maintenant pour participer au tirage au sort exclusif. De nombreux lots incroyables sont à gagner ce soir !</p>
            </header>

            {/* Section Lots (GRID DESIGN) */}
            <section className="max-w-7xl mx-auto px-6 py-12">
                <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2"><Trophy className="text-yellow-500" /> Les Lots à Gagner</h2>
                
                {prizes.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-slate-700 rounded-3xl text-slate-500">Les lots seront dévoilés bientôt...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {prizes.map((prize) => (
                            <div key={prize.id} className="group relative bg-slate-800/50 rounded-3xl border border-slate-700/50 overflow-hidden hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
                                {/* Image avec effet zoom */}
                                <div className="h-64 overflow-hidden bg-slate-900 relative">
                                    {prize.imageUrl ? (
                                        <img src={prize.imageUrl} alt={prize.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-700"><ImageIcon size={48} /></div>
                                    )}
                                    {prize.winnerId && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                            <div className="bg-yellow-500 text-black font-black px-6 py-2 rounded-full transform -rotate-12 shadow-xl">GAGNÉ !</div>
                                        </div>
                                    )}
                                </div>
                                {/* Contenu */}
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-white mb-2">{prize.name}</h3>
                                    <p className="text-sm text-slate-400 line-clamp-2">{prize.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Section Offres (PRICING TABLE) */}
            <section className="max-w-6xl mx-auto px-6 py-20">
                <h2 className="text-center text-3xl font-bold text-white mb-12">Choisis ton Pack</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    {packages.map((pkg) => (
                        <div key={pkg.id} className={`relative p-8 rounded-[40px] border flex flex-col items-center text-center transition-all duration-300 ${pkg.isBestValue ? 'bg-indigo-600 border-indigo-400 scale-110 shadow-2xl shadow-indigo-900/50 z-10' : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'}`}>
                            {pkg.isBestValue && <div className="absolute -top-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">Meilleure Offre</div>}
                            <h3 className={`text-xl font-bold mb-2 ${pkg.isBestValue ? 'text-white' : 'text-slate-300'}`}>{pkg.name}</h3>
                            <div className="text-4xl font-black text-white mb-1">{pkg.ticketCount} <span className="text-lg font-normal opacity-70">Tickets</span></div>
                            <div className={`text-2xl font-bold mb-8 ${pkg.isBestValue ? 'text-indigo-200' : 'text-indigo-400'}`}>{pkg.price}</div>
                            
                            <ParticipantForm pkgId={pkg.id} pkgName={pkg.name} ticketCount={pkg.ticketCount} onRegister={(name) => {
                                const newP = { name, packageId: pkg.id, totalTickets: pkg.ticketCount, date: Date.now() };
                                const pRef = push(ref(db, 'participants'));
                                set(pRef, newP);
                                alert(`Bienvenue ${name} !`);
                            }} />
                        </div>
                    ))}
                </div>
            </section>
            
            <footer className="text-center py-12 text-slate-600 text-sm">
                © 2026 Tombola Event. Designed with ❤️
            </footer>
        </div>
    );
  }

  // --- VUE : ADMIN (DASHBOARD + CONFIG) ---
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
        {/* Sidebar Admin */}
        <aside className="w-20 md:w-64 border-r border-slate-800 p-4 flex flex-col gap-2">
            <div className="font-black text-xl mb-8 px-2 hidden md:block text-indigo-500">ADMIN</div>
            <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}>
                <Ticket size={20} /> <span className="hidden md:inline font-bold text-sm">Vente & Tirage</span>
            </button>
            <button onClick={() => setActiveTab('CONFIG')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'CONFIG' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}>
                <Gift size={20} /> <span className="hidden md:inline font-bold text-sm">Gestion Lots/Prix</span>
            </button>
            <button onClick={() => setView('GUEST')} className="mt-auto flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:text-white">
                <span className="hidden md:inline text-xs font-bold uppercase">Quitter</span>
            </button>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
            {activeTab === 'DASHBOARD' && (
                <div className="max-w-5xl mx-auto space-y-8">
                    <header>
                        <h1 className="text-3xl font-bold">Tableau de bord</h1>
                        <p className="text-slate-400">Gérez les inscriptions et lancez les tirages.</p>
                    </header>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Carte Tirage */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="text-emerald-500"/> Lots Disponibles</h2>
                            <div className="space-y-3">
                                {prizes.filter(p => !p.winnerId).map(p => (
                                    <div key={p.id} className="flex justify-between items-center bg-slate-800 p-4 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            {p.imageUrl && <img src={p.imageUrl} className="w-10 h-10 rounded-lg object-cover" />}
                                            <span className="font-medium">{p.name}</span>
                                        </div>
                                        <button onClick={() => handleDraw(p.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold uppercase tracking-wide">Tirer</button>
                                    </div>
                                ))}
                                {prizes.every(p => p.winnerId) && <p className="text-slate-500 italic">Tous les lots ont été gagnés !</p>}
                            </div>
                        </div>

                        {/* Carte Participants */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                             <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Ticket className="text-indigo-500"/> Derniers Inscrits</h2>
                             <div className="space-y-2 max-h-64 overflow-y-auto">
                                {participants.slice().reverse().map(p => (
                                    <div key={p.id || Math.random()} className="flex justify-between text-sm py-2 border-b border-slate-800 last:border-0">
                                        <span className="text-slate-300">{p.name}</span>
                                        <span className="font-mono text-indigo-400">{p.totalTickets} tkts</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'CONFIG' && (
                <div className="max-w-4xl mx-auto space-y-12">
                    <ConfigPackages packages={packages} onSave={(pkgs) => {
                        // Convertir array en object pour Firebase
                        const obj = pkgs.reduce((acc, item) => ({...acc, [item.id]: item}), {});
                        dbService.save('packages', obj);
                    }} />
                    
                    <div className="h-px bg-slate-800 w-full"></div>

                    <ConfigPrizes prizes={prizes} onSave={(newPrizes) => {
                        const obj = newPrizes.reduce((acc, item) => ({...acc, [item.id]: item}), {});
                        dbService.save('prizes', obj);
                    }} />
                </div>
            )}
        </main>
    </div>
  );
}

// --- SOUS-COMPOSANTS (Pour alléger le code principal) ---

// Formulaire Inscription Rapide (User Side)
const ParticipantForm = ({pkgId, pkgName, ticketCount, onRegister}: any) => {
    const [name, setName] = useState('');
    return (
        <form onSubmit={(e) => { e.preventDefault(); if(name) { onRegister(name); setName(''); } }} className="w-full mt-auto">
            <input 
                type="text" value={name} onChange={e => setName(e.target.value)} 
                placeholder="Ton Nom complet..." 
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 mb-3 focus:outline-none focus:bg-black/40 text-sm"
            />
            <button className="w-full bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors uppercase text-xs tracking-widest">
                Acheter {pkgName}
            </button>
        </form>
    );
};

// Editeur de Packages (Admin)
const ConfigPackages = ({packages, onSave}: {packages: TicketPackage[], onSave: (p: TicketPackage[]) => void}) => {
    const addPkg = () => onSave([...packages, {id: crypto.randomUUID(), name: 'Nouveau', price: '0 ₪', ticketCount: 1, isBestValue: false}]);
    const updatePkg = (idx: number, field: string, val: any) => {
        const newPkgs = [...packages];
        (newPkgs[idx] as any)[field] = val;
        onSave(newPkgs);
    };
    
    return (
        <section>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">📦 Configuration des Offres</h2>
                <button onClick={addPkg} className="bg-indigo-600 p-2 rounded-lg hover:bg-indigo-500"><Plus size={20}/></button>
            </div>
            <div className="grid gap-4">
                {packages.map((pkg, idx) => (
                    <div key={pkg.id} className="flex gap-4 items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <input value={pkg.name} onChange={e => updatePkg(idx, 'name', e.target.value)} className="bg-transparent border-b border-slate-700 p-2 w-1/3 outline-none focus:border-indigo-500" placeholder="Nom" />
                        <input value={pkg.price} onChange={e => updatePkg(idx, 'price', e.target.value)} className="bg-transparent border-b border-slate-700 p-2 w-20 outline-none focus:border-indigo-500" placeholder="Prix" />
                        <div className="flex items-center gap-2">
                            <input type="number" value={pkg.ticketCount} onChange={e => updatePkg(idx, 'ticketCount', parseInt(e.target.value))} className="bg-transparent border-b border-slate-700 p-2 w-16 outline-none text-center" />
                            <span className="text-xs text-slate-500 uppercase">Tkts</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer ml-auto">
                            <input type="checkbox" checked={pkg.isBestValue} onChange={e => updatePkg(idx, 'isBestValue', e.target.checked)} className="accent-indigo-500" />
                            <span className="text-xs text-slate-400">Best Value</span>
                        </label>
                        <button onClick={() => onSave(packages.filter((_, i) => i !== idx))} className="text-slate-600 hover:text-red-500"><Trash2 size={18}/></button>
                    </div>
                ))}
            </div>
        </section>
    );
};

// Editeur de Lots + IMAGES (Admin)
const ConfigPrizes = ({prizes, onSave}: {prizes: Prize[], onSave: (p: Prize[]) => void}) => {
    const addPrize = () => onSave([...prizes, {id: crypto.randomUUID(), name: 'Nouveau Lot', description: 'Description...', imageUrl: ''}]);
    
    const handleImageUpload = (file: File, idx: number) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const newPrizes = [...prizes];
            newPrizes[idx].imageUrl = reader.result as string; // Stockage Base64
            onSave(newPrizes);
        };
        if(file) reader.readAsDataURL(file);
    };

    const updatePrize = (idx: number, field: string, val: any) => {
        const newPrizes = [...prizes];
        (newPrizes[idx] as any)[field] = val;
        onSave(newPrizes);
    };

    return (
        <section>
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">🏆 Configuration des Lots</h2>
                <button onClick={addPrize} className="bg-emerald-600 p-2 rounded-lg hover:bg-emerald-500"><Plus size={20}/></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {prizes.map((prize, idx) => (
                    <div key={prize.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 relative group">
                        <button onClick={() => onSave(prizes.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-600 hover:text-red-500"><Trash2 size={18}/></button>
                        
                        {/* Zone Image */}
                        <div className="mb-4">
                            <div className="h-40 w-full bg-slate-950 rounded-xl border border-dashed border-slate-700 flex items-center justify-center overflow-hidden relative">
                                {prize.imageUrl ? (
                                    <img src={prize.imageUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-slate-600 flex flex-col items-center"><ImageIcon className="mb-2"/> <span className="text-xs">Pas d'image</span></div>
                                )}
                                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                    <span className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold flex gap-2"><Upload size={14}/> Changer</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], idx)} />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <input value={prize.name} onChange={e => updatePrize(idx, 'name', e.target.value)} className="w-full bg-transparent border-b border-slate-700 p-2 font-bold text-lg outline-none focus:border-emerald-500" placeholder="Nom du lot" />
                            <textarea value={prize.description} onChange={e => updatePrize(idx, 'description', e.target.value)} className="w-full bg-slate-950/50 rounded-lg p-3 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500" rows={2} placeholder="Description courte..." />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
