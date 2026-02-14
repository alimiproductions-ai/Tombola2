import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, remove } from "firebase/database";

// --- 1. CONFIGURATION FIREBASE ---
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

// Initialisation immédiate pour éviter les erreurs
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- 2. TYPES ET DONNÉES PAR DÉFAUT ---
interface TicketPackage { id: string; name: string; description: string; ticketCount: number; }
interface Prize { id: string; name: string; description: string; winnerId?: string; }
interface Participant { id?: string; name: string; packageId: string; totalTickets: number; }

const INITIAL_PACKAGES = [
  { id: 'p1', name: 'Pack Standard', description: '26 ₪', ticketCount: 1 },
  { id: 'p2', name: 'Pack Gold', description: '52 ₪', ticketCount: 3 },
  { id: 'p3', name: 'Pack Platinum', description: '100 ₪', ticketCount: 7 }
];

const INITIAL_PRIZES = [
  { id: 'prz1', name: 'Grand Prix', description: 'Un voyage incroyable' }
];

const ADMIN_PASSWORD = "nanah148";

// --- 3. FONCTIONS UTILITAIRES (Simule l'IA et gère la DB) ---
const getWinnerCheer = (name: string) => {
    const msgs = ["Incroyable !", "C'est la folie !", "Mazal Tov !", "Quelle chance !"];
    return `${msgs[Math.floor(Math.random() * msgs.length)]} Bravo ${name} !`;
};

// Service Database simplifié
const dbService = {
  subscribe: (path: string, callback: (val: any) => void) => {
    const dbRef = ref(db, path);
    return onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      // Si c'est un objet (comme firebase renvoie), on le transforme en tableau
      if (val && typeof val === 'object' && path === 'participants') {
         const list = Object.entries(val).map(([k, v]: [string, any]) => ({ id: k, ...v }));
         callback(list);
      } else {
         callback(val || (path === 'participants' ? [] : null));
      }
    });
  },
  add: async (path: string, data: any) => push(ref(db, path), data),
  update: async (path: string, data: any) => set(ref(db, path), data),
  remove: async (path: string) => remove(ref(db, path))
};

// --- 4. COMPOSANT PRINCIPAL ---
export default function App() {
  // États
  const [view, setView] = useState<'GUEST' | 'ADMIN' | 'DRAW'>('GUEST');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [packages, setPackages] = useState<TicketPackage[]>(INITIAL_PACKAGES);
  const [prizes, setPrizes] = useState<Prize[]>(INITIAL_PRIZES);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // États pour le tirage
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<string>('');
  const [finalWinner, setFinalWinner] = useState<{name: string, prize: string, msg: string} | null>(null);

  // Chargement des données au démarrage
  useEffect(() => {
    // Si la DB est vide, on met les valeurs par défaut
    dbService.subscribe('packages', (data) => setPackages(data || INITIAL_PACKAGES));
    dbService.subscribe('prizes', (data) => setPrizes(data || INITIAL_PRIZES));
    dbService.subscribe('participants', (data) => setParticipants(data || []));
  }, []);

  // --- ACTIONS ---
  const handleAddParticipant = (name: string, pkgId: string) => {
    const pkg = packages.find(p => p.id === pkgId);
    if (!pkg) return;
    dbService.add('participants', {
      name, packageId: pkgId, totalTickets: pkg.ticketCount, date: Date.now()
    });
    alert(`✅ ${name} inscrit avec ${pkg.ticketCount} tickets !`);
  };

  const handleDraw = (prizeId: string) => {
    if (participants.length === 0) return alert("Personne n'est inscrit !");
    
    // Créer la "piscine" de tickets (plus tu as de tickets, plus tu as ton nom)
    const pool: string[] = [];
    participants.forEach(p => {
        for(let i=0; i<p.totalTickets; i++) pool.push(p.name);
    });

    setView('DRAW');
    setIsDrawing(true);
    setFinalWinner(null);

    // Animation du tirage
    let counter = 0;
    const interval = setInterval(() => {
        setCurrentWinner(pool[Math.floor(Math.random() * pool.length)]);
        counter++;
        if (counter > 20) { // Après 20 changements (environ 2-3 sec)
            clearInterval(interval);
            finishDraw(prizeId, pool);
        }
    }, 100);
  };

  const finishDraw = (prizeId: string, pool: string[]) => {
    const winnerName = pool[Math.floor(Math.random() * pool.length)];
    const prize = prizes.find(p => p.id === prizeId);
    const winnerObj = participants.find(p => p.name === winnerName);

    if (prize && winnerObj) {
        // Mettre à jour le lot comme "gagné" dans la DB
        const updatedPrizes = prizes.map(p => p.id === prizeId ? {...p, winnerId: winnerObj.id} : p);
        dbService.update('prizes', updatedPrizes);
        
        setIsDrawing(false);
        setFinalWinner({
            name: winnerName,
            prize: prize.name,
            msg: getWinnerCheer(winnerName)
        });
    }
  };

  const handleLogin = () => {
    if (prompt("Mot de passe ?") === ADMIN_PASSWORD) {
        setIsAdmin(true);
        setView('ADMIN');
    }
  };

  // --- RENDU ---
  
  // 1. Vue TIRAGE AU SORT (Animation)
  if (view === 'DRAW') {
    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-10 text-center">
            {isDrawing ? (
                <>
                    <h1 className="text-4xl mb-10 text-indigo-400 font-bold animate-pulse">TIRAGE EN COURS...</h1>
                    <div className="text-6xl font-black bg-white/10 p-10 rounded-3xl border border-white/20">
                        {currentWinner}
                    </div>
                </>
            ) : finalWinner ? (
                <div className="space-y-8 animate-bounce-in">
                    <h1 className="text-6xl font-black text-yellow-400">MAZAL TOV ! 🥳</h1>
                    <div className="bg-white/10 p-10 rounded-3xl backdrop-blur-xl border border-yellow-500/50">
                        <p className="text-2xl text-slate-300">Le gagnant est :</p>
                        <p className="text-5xl font-bold my-4">{finalWinner.name}</p>
                        <p className="text-xl text-indigo-300">Remporte : {finalWinner.prize}</p>
                        <p className="mt-8 italic text-sm text-slate-400">"{finalWinner.msg}"</p>
                    </div>
                    <button onClick={() => setView('ADMIN')} className="bg-white text-black px-8 py-3 rounded-full font-bold">Retour Admin</button>
                </div>
            ) : null}
        </div>
    );
  }

  // 2. Vue INVITÉ (Inscription)
  if (view === 'GUEST') {
    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center">
            <h1 className="text-5xl font-black text-yellow-500 mb-2">TOMBOLA 🎟️</h1>
            <p className="text-indigo-300 mb-10 uppercase tracking-widest text-xs">Inscris-toi maintenant</p>

            <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
                <ParticipantForm packages={packages} onAdd={handleAddParticipant} />
            </div>
            
            <div className="mt-10 grid grid-cols-2 gap-4 text-center w-full max-w-md">
                <div className="bg-slate-800/50 p-4 rounded-xl">
                    <p className="text-2xl font-bold">{participants.length}</p>
                    <p className="text-[10px] uppercase text-slate-500">Participants</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl">
                    <p className="text-2xl font-bold">{prizes.length}</p>
                    <p className="text-[10px] uppercase text-slate-500">Lots</p>
                </div>
            </div>

            <button onClick={handleLogin} className="mt-12 text-xs text-slate-600 uppercase font-bold">Admin Access</button>
        </div>
    );
  }

  // 3. Vue ADMIN (Gestion & Tirage)
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
        <header className="flex justify-between items-center mb-12">
            <h1 className="text-3xl font-bold text-yellow-500">PANEL ADMIN 🛠️</h1>
            <button onClick={() => setView('GUEST')} className="text-xs bg-slate-800 px-4 py-2 rounded-lg">Voir mode invité</button>
        </header>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Colonne Gauche : Inscription Rapide */}
            <div className="bg-indigo-900/20 border border-indigo-500/20 p-8 rounded-3xl">
                <h2 className="text-xl font-bold mb-6 text-indigo-400">📝 Inscription Manuelle</h2>
                <ParticipantForm packages={packages} onAdd={handleAddParticipant} />
            </div>

            {/* Colonne Droite : Liste des Lots et Tirage */}
            <div className="bg-emerald-900/10 border border-emerald-500/20 p-8 rounded-3xl">
                <h2 className="text-xl font-bold mb-6 text-emerald-400">🏆 Lancer un Tirage</h2>
                <div className="space-y-4">
                    {prizes.map(prize => (
                        <div key={prize.id} className={`p-4 rounded-xl border flex justify-between items-center ${prize.winnerId ? 'bg-slate-900 border-slate-700 opacity-50' : 'bg-slate-800 border-slate-600'}`}>
                            <div>
                                <p className="font-bold">{prize.name}</p>
                                {prize.winnerId ? (
                                    <p className="text-xs text-emerald-500">Gagné par : {participants.find(p => p.id === prize.winnerId)?.name}</p>
                                ) : (
                                    <p className="text-xs text-slate-400">{prize.description}</p>
                                )}
                            </div>
                            {!prize.winnerId && (
                                <button onClick={() => handleDraw(prize.id)} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                                    TIRER LE SORT 🎲
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Liste des participants en bas */}
        <div className="mt-12">
            <h2 className="text-xl font-bold mb-6">Liste des Inscrits ({participants.length})</h2>
            <div className="bg-slate-900 rounded-3xl p-6 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead>
                        <tr className="uppercase text-xs border-b border-slate-800"><th className="pb-4">Nom</th><th className="pb-4">Pack</th><th className="pb-4">Tickets</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {participants.map(p => (
                            <tr key={p.id || Math.random()}>
                                <td className="py-4 text-white font-medium">{p.name}</td>
                                <td className="py-4">{packages.find(pk => pk.id === p.packageId)?.name}</td>
                                <td className="py-4 text-white">{p.totalTickets}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {participants.length > 0 && (
                <button onClick={() => {if(confirm("Tout effacer ?")) dbService.remove('participants')}} className="mt-4 text-red-500 text-xs hover:underline">Reset Participants</button>
            )}
        </div>
    </div>
  );
}

// Composant Formulaire Interne
const ParticipantForm = ({ packages, onAdd }: { packages: TicketPackage[], onAdd: (n:string, p:string)=>void }) => {
    const [name, setName] = useState('');
    const [pkg, setPkg] = useState(packages[0]?.id || '');
    
    // Met à jour le pack par défaut si les données chargent tardivement
    useEffect(() => { if(!pkg && packages.length) setPkg(packages[0].id) }, [packages, pkg]);

    return (
        <form onSubmit={(e) => {e.preventDefault(); onAdd(name, pkg); setName('');}} className="space-y-4">
            <input 
                value={name} onChange={e => setName(e.target.value)} 
                placeholder="Nom du participant..." 
                className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white focus:border-indigo-500 outline-none" 
                required 
            />
            <select 
                value={pkg} onChange={e => setPkg(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white focus:border-indigo-500 outline-none"
            >
                {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.ticketCount} tickets)</option>)}
            </select>
            <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all">
                VALIDER L'INSCRIPTION
            </button>
        </form>
    );
};
