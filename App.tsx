import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, remove, update } from "firebase/database";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const ADMIN_PASSWORD = "admin";

// --- 2. ICÔNES SVG (Zéro dépendance) ---
const Icons = {
    Trophy: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
    Ticket: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>,
    Gift: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.9 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>,
    Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
    Image: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
    Upload: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
    Exit: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
    UserPlus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" x2="20" y1="8" y2="14"/><line x1="23" x2="17" y1="11" y2="11"/></svg>
};

// --- 3. TYPES ---
interface TicketPackage { id: string; name: string; price: string; ticketCount: number; isBestValue?: boolean; }
interface Prize { id: string; name: string; description: string; imageUrl?: string; winnerId?: string; }
interface Participant { id?: string; name: string; packageId: string; totalTickets: number; date: number; }

// --- 4. COMPOSANT APP ---
export default function App() {
  const [view, setView] = useState<'GUEST' | 'ADMIN' | 'DRAW'>('GUEST');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CONFIG'>('DASHBOARD');
  
  // Data States
  const [packages, setPackages] = useState<TicketPackage[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // Draw States
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinnerName, setCurrentWinnerName] = useState('');
  const [finalWinner, setFinalWinner] = useState<{name: string, prize: Prize} | null>(null);

  // --- SYNC FIREBASE ---
  useEffect(() => {
    onValue(ref(db, 'packages'), (snapshot) => {
        const val = snapshot.val();
        setPackages(val ? Object.entries(val).map(([k,v]:[string,any]) => ({id:k, ...v})) : []);
    });
    onValue(ref(db, 'prizes'), (snapshot) => {
        const val = snapshot.val();
        setPrizes(val ? Object.entries(val).map(([k,v]:[string,any]) => ({id:k, ...v})) : []);
    });
    onValue(ref(db, 'participants'), (snapshot) => {
        const val = snapshot.val();
        setParticipants(val ? Object.entries(val).map(([k,v]:[string,any]) => ({id:k, ...v})) : []);
    });
  }, []);

  // --- ACTIONS DB ---
  
  // 1. Ajouter un Pack
  const handleAddPackage = () => {
      const newRef = push(ref(db, 'packages'));
      set(newRef, { name: 'Nouveau Pack', price: '10 ₪', ticketCount: 1, isBestValue: false });
  };

  // 2. Ajouter un Lot
  const handleAddPrize = () => {
      const newRef = push(ref(db, 'prizes'));
      set(newRef, { name: 'Nouveau Lot', description: 'Description du lot', imageUrl: '' });
  };

  // 3. Inscription (Générique)
  const registerParticipant = async (name: string, pkgId: string) => {
      const pkg = packages.find(p => p.id === pkgId);
      if (!pkg || !name.trim()) return;
      
      const newRef = push(ref(db, 'participants'));
      await set(newRef, {
          name: name.trim(),
          packageId: pkg.id,
          totalTickets: Number(pkg.ticketCount),
          date: Date.now()
      });
  };

  // 4. Update Générique (sécurisé)
  const updateItem = (path: string, id: string, field: string, value: any) => {
      update(ref(db, `${path}/${id}`), { [field]: value });
  };

  // 5. Upload Image
  const handleImageUpload = (file: File, prizeId: string) => {
      if (file.size > 2000000) return alert("Image trop lourde (Max 2Mo)");
      const reader = new FileReader();
      reader.onloadend = () => {
          update(ref(db, `prizes/${prizeId}`), { imageUrl: reader.result });
      };
      reader.readAsDataURL(file);
  };

  // 6. Tirage au sort
  const runDraw = (prizeId: string) => {
      const pool: string[] = [];
      participants.forEach(p => {
          for(let i=0; i<p.totalTickets; i++) pool.push(p.name);
      });

      if (pool.length === 0) return alert("Aucun participant inscrit !");

      setView('DRAW');
      setIsDrawing(true);
      
      let count = 0;
      const interval = setInterval(() => {
          setCurrentWinnerName(pool[Math.floor(Math.random() * pool.length)]);
          count++;
          if(count > 25) {
              clearInterval(interval);
              const winnerName = pool[Math.floor(Math.random() * pool.length)];
              const winner = participants.find(p => p.name === winnerName);
              const prize = prizes.find(p => p.id === prizeId);
              
              if(winner && prize) {
                  update(ref(db, `prizes/${prizeId}`), { winnerId: winner.id });
                  setIsDrawing(false);
                  setFinalWinner({name: winnerName, prize});
              }
          }
      }, 100);
  };

  // --- VUES ---

  if (view === 'DRAW') {
      return (
          <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center p-4">
               {isDrawing ? (
                   <div className="text-center animate-pulse space-y-8">
                       <h1 className="text-4xl text-indigo-400 font-bold uppercase tracking-widest">Tirage en cours</h1>
                       <div className="text-7xl md:text-9xl font-black">{currentWinnerName}</div>
                   </div>
               ) : finalWinner ? (
                   <div className="text-center space-y-8 animate-in zoom-in max-w-2xl bg-white/10 p-12 rounded-[50px] border border-white/20 backdrop-blur-xl">
                       <h1 className="text-6xl text-yellow-400 font-black drop-shadow-lg">FÉLICITATIONS !</h1>
                       {finalWinner.prize.imageUrl && <img src={finalWinner.prize.imageUrl} className="w-48 h-48 object-cover rounded-xl mx-auto shadow-2xl border-4 border-white/20"/>}
                       <div>
                           <p className="text-xl text-indigo-300 uppercase tracking-widest mb-2">Le gagnant est</p>
                           <p className="text-6xl font-black">{finalWinner.name}</p>
                       </div>
                       <div className="bg-indigo-600/30 p-4 rounded-xl border border-indigo-500/30">
                           <p className="text-xl">Remporte : <span className="font-bold text-yellow-300">{finalWinner.prize.name}</span></p>
                       </div>
                       <button onClick={() => setView('ADMIN')} className="px-8 py-3 bg-white text-black font-bold rounded-full uppercase tracking-widest hover:scale-105 transition-transform">Retour Admin</button>
                   </div>
               ) : null}
          </div>
      )
  }

  if (view === 'GUEST') {
      return (
          <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans p-6">
              <nav className="flex justify-between items-center max-w-6xl mx-auto mb-12">
                  <div className="text-2xl font-black text-white">TOMBOLA<span className="text-indigo-500">.APP</span></div>
                  <button onClick={() => { if(prompt("Admin?") === ADMIN_PASSWORD) setView('ADMIN'); }} className="text-xs font-bold uppercase opacity-30 hover:opacity-100">Login</button>
              </nav>

              <header className="text-center mb-20 space-y-4">
                  <h1 className="text-5xl md:text-7xl font-black text-white">Tente ta chance.</h1>
                  <p className="text-indigo-400 uppercase tracking-widest font-bold">Grande Soirée 2026</p>
              </header>

              <div className="max-w-6xl mx-auto grid gap-20">
                  {/* Section LOTS */}
                  <section>
                      <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2"><Icons.Trophy/> Lots à Gagner</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {prizes.map(p => (
                              <div key={p.id} className="bg-slate-800/50 rounded-3xl overflow-hidden border border-slate-700 hover:border-indigo-500 transition-all group">
                                  <div className="h-56 bg-slate-900 relative">
                                      {p.imageUrl ? (
                                          <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                      ) : (
                                          <div className="w-full h-full flex items-center justify-center text-slate-700"><Icons.Image/></div>
                                      )}
                                      {p.winnerId && <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-black text-yellow-400 tracking-widest">GAGNÉ !</div>}
                                  </div>
                                  <div className="p-6">
                                      <h3 className="font-bold text-white text-lg">{p.name}</h3>
                                      <p className="text-sm text-slate-400">{p.description}</p>
                                  </div>
                              </div>
                          ))}
                          {prizes.length === 0 && <p className="text-slate-500 italic">Aucun lot pour le moment.</p>}
                      </div>
                  </section>

                  {/* Section PACKS */}
                  <section>
                      <h2 className="text-2xl font-bold text-white mb-8 text-center">Choisis ton Pack</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                          {packages.map(pkg => (
                              <div key={pkg.id} className={`p-8 rounded-[40px] border flex flex-col items-center text-center relative ${pkg.isBestValue ? 'bg-indigo-600 border-indigo-400 shadow-2xl scale-105 z-10' : 'bg-slate-800/40 border-slate-700'}`}>
                                  {pkg.isBestValue && <div className="absolute -top-3 bg-pink-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Top Offre</div>}
                                  <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                                  <div className="text-4xl font-black mb-1">{pkg.ticketCount} <span className="text-lg font-normal opacity-70">Tickets</span></div>
                                  <div className="text-2xl font-bold text-indigo-200 mb-8">{pkg.price}</div>
                                  
                                  <form className="w-full" onSubmit={(e: any) => {
                                      e.preventDefault();
                                      registerParticipant(e.target.elements.name.value, pkg.id);
                                      e.target.reset();
                                      alert("Inscription validée !");
                                  }}>
                                      <input name="name" placeholder="Ton Nom..." required className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 mb-3 text-white focus:outline-none focus:bg-black/40"/>
                                      <button className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-indigo-50 uppercase text-xs tracking-widest">Acheter</button>
                                  </form>
                              </div>
                          ))}
                      </div>
                  </section>
              </div>
              <footer className="text-center mt-20 text-slate-600 text-xs">© 2026 Tombola</footer>
          </div>
      )
  }

  // VUE ADMIN
  return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row">
          <aside className="w-full md:w-64 bg-slate-900/50 border-r border-slate-800 p-6 flex flex-col gap-2">
              <div className="font-black text-xl text-indigo-500 mb-8">ADMIN</div>
              <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold ${activeTab === 'DASHBOARD' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-900'}`}><Icons.Ticket/> Dashboard</button>
              <button onClick={() => setActiveTab('CONFIG')} className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold ${activeTab === 'CONFIG' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-900'}`}><Icons.Gift/> Config</button>
              <button onClick={() => setView('GUEST')} className="mt-auto flex items-center gap-3 p-3 text-slate-500 hover:text-white text-xs font-bold uppercase"><Icons.Exit/> Quitter</button>
          </aside>

          <main className="flex-1 p-8 overflow-y-auto">
              {activeTab === 'DASHBOARD' && (
                  <div className="max-w-5xl mx-auto space-y-8">
                      <h1 className="text-3xl font-bold">Tableau de bord</h1>
                      
                      {/* AJOUT MANUEL (Ce qu'il manquait) */}
                      <div className="bg-indigo-900/20 border border-indigo-500/30 p-6 rounded-3xl">
                          <h2 className="font-bold mb-4 flex items-center gap-2 text-indigo-400"><Icons.UserPlus/> Inscription Manuelle</h2>
                          <div className="flex flex-col md:flex-row gap-4">
                              <input id="manualName" placeholder="Nom du participant..." className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"/>
                              <select id="manualPkg" className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none">
                                  {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.ticketCount} tkts)</option>)}
                              </select>
                              <button onClick={() => {
                                  const nameInput = document.getElementById('manualName') as HTMLInputElement;
                                  const pkgInput = document.getElementById('manualPkg') as HTMLSelectElement;
                                  registerParticipant(nameInput.value, pkgInput.value);
                                  nameInput.value = '';
                                  alert("Participant ajouté !");
                              }} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold text-sm uppercase">Ajouter</button>
                          </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-8">
                          {/* LISTE INSCRITS */}
                          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                              <div className="flex justify-between items-center mb-6">
                                  <h2 className="font-bold flex items-center gap-2"><Icons.Ticket/> Inscrits ({participants.length})</h2>
                                  <button onClick={() => {if(confirm("Supprimer tout le monde ?")) remove(ref(db, 'participants'))}} className="text-xs text-red-500 hover:underline">Reset</button>
                              </div>
                              <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                                  {[...participants].reverse().map(p => (
                                      <div key={p.id} className="flex justify-between text-sm bg-slate-800/50 p-3 rounded-xl border border-white/5">
                                          <span>{p.name}</span>
                                          <span className="text-indigo-400 font-mono font-bold">{p.totalTickets} tkts</span>
                                          <button onClick={() => remove(ref(db, `participants/${p.id}`))} className="text-slate-600 hover:text-red-500"><Icons.Trash/></button>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          {/* TIRAGE */}
                          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                              <h2 className="font-bold mb-6 flex items-center gap-2 text-emerald-400"><Icons.Trophy/> Lancer un Tirage</h2>
                              <div className="space-y-3">
                                  {prizes.filter(p => !p.winnerId).map(p => (
                                      <div key={p.id} className="flex justify-between items-center bg-slate-800 p-4 rounded-xl">
                                          <span className="font-medium">{p.name}</span>
                                          <button onClick={() => runDraw(p.id)} className="bg-emerald-600 px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-500">Tirer</button>
                                      </div>
                                  ))}
                                  {prizes.filter(p => !p.winnerId).length === 0 && <p className="text-slate-500 italic text-sm">Tous les lots sont gagnés.</p>}
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'CONFIG' && (
                  <div className="max-w-4xl mx-auto space-y-12">
                      {/* CONFIG PACKS */}
                      <section>
                          <div className="flex justify-between items-center mb-6">
                              <h2 className="text-2xl font-bold">📦 Offres Tickets</h2>
                              <button onClick={handleAddPackage} className="bg-indigo-600 p-2 rounded-lg hover:bg-indigo-500"><Icons.Plus/></button>
                          </div>
                          <div className="space-y-4">
                              {packages.map(pkg => (
                                  <div key={pkg.id} className="flex flex-wrap gap-4 items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                                      <input defaultValue={pkg.name} onBlur={(e) => updateItem('packages', pkg.id, 'name', e.target.value)} className="bg-transparent border-b border-slate-700 p-2 w-1/3 outline-none focus:border-indigo-500 font-bold"/>
                                      <input defaultValue={pkg.price} onBlur={(e) => updateItem('packages', pkg.id, 'price', e.target.value)} className="bg-transparent border-b border-slate-700 p-2 w-20 outline-none focus:border-indigo-500"/>
                                      <input type="number" defaultValue={pkg.ticketCount} onBlur={(e) => updateItem('packages', pkg.id, 'ticketCount', e.target.value)} className="bg-transparent border-b border-slate-700 p-2 w-16 outline-none text-center"/>
                                      <span className="text-xs text-slate-500 uppercase">Tkts</span>
                                      <label className="flex items-center gap-2 cursor-pointer ml-auto bg-slate-800 px-3 py-1 rounded-lg">
                                          <input type="checkbox" checked={pkg.isBestValue} onChange={(e) => updateItem('packages', pkg.id, 'isBestValue', e.target.checked)} className="accent-indigo-500"/>
                                          <span className="text-xs text-slate-400">Star</span>
                                      </label>
                                      <button onClick={() => remove(ref(db, `packages/${pkg.id}`))} className="text-slate-600 hover:text-red-500"><Icons.Trash/></button>
                                  </div>
                              ))}
                          </div>
                      </section>
                      
                      <div className="h-px bg-slate-800 w-full"></div>

                      {/* CONFIG LOTS */}
                      <section>
                          <div className="flex justify-between items-center mb-6">
                              <h2 className="text-2xl font-bold">🏆 Lots</h2>
                              <button onClick={handleAddPrize} className="bg-emerald-600 p-2 rounded-lg hover:bg-emerald-500"><Icons.Plus/></button>
                          </div>
                          <div className="grid md:grid-cols-2 gap-6">
                              {prizes.map(p => (
                                  <div key={p.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 relative group">
                                      <button onClick={() => remove(ref(db, `prizes/${p.id}`))} className="absolute top-4 right-4 text-slate-600 hover:text-red-500 z-10 bg-slate-900 p-2 rounded-lg"><Icons.Trash/></button>
                                      
                                      <div className="mb-4 h-40 bg-slate-950 rounded-xl border border-dashed border-slate-700 relative overflow-hidden flex items-center justify-center">
                                          {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover"/> : <span className="text-slate-600 text-xs">Pas d'image</span>}
                                          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                              <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold flex gap-2"><Icons.Upload/> Changer</span>
                                              <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], p.id)}/>
                                          </label>
                                      </div>

                                      <div className="space-y-3">
                                          <input defaultValue={p.name} onBlur={(e) => updateItem('prizes', p.id, 'name', e.target.value)} className="w-full bg-transparent border-b border-slate-700 p-2 font-bold outline-none focus:border-emerald-500" placeholder="Nom du lot"/>
                                          <textarea defaultValue={p.description} onBlur={(e) => updateItem('prizes', p.id, 'description', e.target.value)} className="w-full bg-slate-950/50 rounded-lg p-3 text-sm text-slate-300 outline-none focus:border-emerald-500 resize-none" rows={2}/>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </section>
                  </div>
              )}
          </main>
      </div>
  )
}
