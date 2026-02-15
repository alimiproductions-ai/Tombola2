import React, { useState, useEffect } from 'react';
import { ref, push, set, remove, update } from 'firebase/database';
import { db } from '../firebase';
import { Participant, Prize, AppSettings, DrawRecord, TicketPack } from '../types';

interface AdminDashboardProps {
  participants: Participant[];
  prizes: Prize[];
  settings: AppSettings;
  ticketPacks: TicketPack[];
  drawHistory: DrawRecord[];
  onDraw: (prize: Prize) => void;
}

const ADMIN_PASSWORD = "nanah148alimi";

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  participants, prizes, settings, ticketPacks, drawHistory, onDraw 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'participants' | 'prizes' | 'packs' | 'settings'>('stats');
  
  const [newPrizeName, setNewPrizeName] = useState('');
  const [newPrizeImg, setNewPrizeImg] = useState('');
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);

  // Pack form state
  const [packForm, setPackForm] = useState<Partial<TicketPack>>({ label: '', description: '', price: 0, bonus: '', tickets: 0 });
  const [editingPackId, setEditingPackId] = useState<string | null>(null);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const addPrize = async () => {
    if (!newPrizeName) return;
    const newRef = push(ref(db, 'prizes'));
    await set(newRef, { name: newPrizeName, image: newPrizeImg || `https://picsum.photos/seed/${Date.now()}/400/300`, active: true });
    setNewPrizeName(''); setNewPrizeImg('');
  };

  const deletePrize = async (id: string) => { if(confirm("Supprimer ce lot ?")) await remove(ref(db, `prizes/${id}`)); };
  const deleteParticipant = async (id: string) => { if(confirm("Supprimer ce participant ?")) await remove(ref(db, `participants/${id}`)); };

  const saveParticipantQty = async (p: Participant) => {
      await update(ref(db, `participants/${p.id}`), { tickets: editQty, totalAmount: editQty * settings.unitPrice });
      setEditingParticipant(null);
  };

  const updateGlobalSettings = async (updates: Partial<AppSettings>) => { await update(ref(db, 'settings'), updates); };

  const handleSavePack = async () => {
    if (!packForm.label || !packForm.price) return;
    if (editingPackId) {
      await update(ref(db, `ticketPacks/${editingPackId}`), packForm);
    } else {
      await push(ref(db, 'ticketPacks'), packForm);
    }
    setPackForm({ label: '', description: '', price: 0, bonus: '', tickets: 0 });
    setEditingPackId(null);
  };

  const deletePack = async (id: string) => { if(confirm("Supprimer ce pack ?")) await remove(ref(db, `ticketPacks/${id}`)); };

  const totalTickets = participants.reduce((acc, p) => acc + (Number(p.tickets) || 0), 0);
  const totalRevenue = participants.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card-glass p-8 rounded-3xl w-full max-w-md shadow-2xl border-amber-500/20 text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-2xl font-festive text-amber-200 mb-6">Accès Administrateur</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" placeholder="Mot de passe" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
              className={`w-full bg-white/5 border ${authError ? 'border-rose-500' : 'border-white/10'} rounded-xl px-4 py-3 text-center tracking-widest text-white outline-none focus:ring-2 focus:ring-amber-500`} />
            {authError && <p className="text-rose-500 text-xs">Accès refusé</p>}
            <button type="submit" className="w-full btn-gold py-3 rounded-xl font-bold">Débloquer</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <i className="fas fa-cog text-slate-400"></i> Admin Console
        </h1>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full">
          {(['stats', 'participants', 'prizes', 'packs', 'settings'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${ activeTab === tab ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white' }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-glass p-6 rounded-2xl border-l-4 border-amber-500">
            <div className="text-slate-400 text-sm font-medium">Participants</div>
            <div className="text-4xl font-bold mt-1">{participants.length}</div>
          </div>
          <div className="card-glass p-6 rounded-2xl border-l-4 border-emerald-500">
            <div className="text-slate-400 text-sm font-medium">Tickets Total</div>
            <div className="text-4xl font-bold mt-1">{totalTickets}</div>
          </div>
          <div className="card-glass p-6 rounded-2xl border-l-4 border-blue-500">
            <div className="text-slate-400 text-sm font-medium">Total Général</div>
            <div className="text-4xl font-bold mt-1">{totalRevenue} ₪</div>
          </div>
          <div className="md:col-span-3 card-glass p-8 rounded-2xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-amber-300">
                <i className="fas fa-play-circle"></i> Lancer un Tirage
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {prizes.filter(p => p.active).map(prize => (
                    <button key={prize.id} onClick={() => onDraw(prize)} disabled={participants.length === 0}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-800 border border-white/5 hover:border-amber-500 transition-all group disabled:opacity-50"
                    >
                        <div className="flex items-center gap-3">
                            <img src={prize.image} className="w-10 h-10 rounded-lg object-cover" />
                            <span className="font-medium text-white">{prize.name}</span>
                        </div>
                        <i className="fas fa-dice text-amber-500"></i>
                    </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="card-glass p-6 rounded-2xl">
          <h3 className="text-xl font-bold mb-6">Gestion des Participants</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="text-slate-500 border-b border-white/5">
                  <th className="pb-4 font-medium">Nom</th>
                  {/* --- MODIFICATION 1 : Ajout En-tête Téléphone --- */}
                  <th className="pb-4 font-medium">Téléphone</th>
                  <th className="pb-4 font-medium">Tickets</th>
                  <th className="pb-4 font-medium">Mode</th>
                  <th className="pb-4 font-medium">Total</th>
                  <th className="pb-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {participants.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-4 font-medium text-white">{p.name}</td>
                    
                    {/* --- MODIFICATION 2 : Ajout Cellule Téléphone --- */}
                    <td className="py-4 text-slate-300 font-mono text-sm">{p.phone}</td>
                    
                    <td className="py-4">
                      {editingParticipant === p.id ? (
                        <input type="number" value={editQty} onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                          className="w-20 bg-white/10 border border-amber-500/50 rounded px-2 py-1 outline-none" onBlur={() => saveParticipantQty(p)} autoFocus />
                      ) : (
                        <span onClick={() => {setEditingParticipant(p.id); setEditQty(p.tickets);}}
                          className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg text-sm font-bold cursor-pointer hover:bg-amber-500/40">
                          {p.tickets} 🎟
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-xs text-slate-400 uppercase tracking-widest">
                      {p.mode === 'pack' ? `Pack: ${p.packLabel}` : 'Libre'}
                    </td>
                    <td className="py-4 text-emerald-400 font-bold">{p.totalAmount} ₪</td>
                    <td className="py-4 text-right">
                      <button onClick={() => deleteParticipant(p.id)} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'packs' && (
        <div className="space-y-8">
          <div className="card-glass p-6 rounded-2xl">
            <h3 className="text-xl font-bold mb-4">{editingPackId ? 'Modifier Pack' : 'Nouveau Pack'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="text" placeholder="Nom du Pack (Pack Simha)" value={packForm.label} onChange={(e) => setPackForm({...packForm, label: e.target.value})}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" />
                <input type="text" placeholder="Description courte" value={packForm.description} onChange={(e) => setPackForm({...packForm, description: e.target.value})}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" />
                <input type="number" placeholder="Prix (₪)" value={packForm.price} onChange={(e) => setPackForm({...packForm, price: parseInt(e.target.value) || 0})}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" />
                <input type="number" placeholder="Nombre de Tickets" value={packForm.tickets} onChange={(e) => setPackForm({...packForm, tickets: parseInt(e.target.value) || 0})}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" />
                <input type="text" placeholder="Bonus (ex: 1 Tikoun)" value={packForm.bonus} onChange={(e) => setPackForm({...packForm, bonus: e.target.value})}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none md:col-span-2" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSavePack} className="flex-1 btn-gold py-3 rounded-xl font-bold">{editingPackId ? 'Enregistrer Modification' : 'Ajouter le Pack'}</button>
              {editingPackId && <button onClick={() => {setEditingPackId(null); setPackForm({label:'', description:'', price:0, bonus:'', tickets:0});}} className="px-6 bg-slate-700 rounded-xl">Annuler</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ticketPacks.map(pack => (
              <div key={pack.id} className="card-glass p-6 rounded-2xl border border-white/5 flex justify-between items-center group">
                <div>
                  <div className="text-xl font-bold text-amber-200">{pack.label}</div>
                  <div className="text-sm text-slate-400">{pack.description}</div>
                  <div className="mt-2 flex gap-4 text-xs font-bold uppercase tracking-widest text-emerald-400">
                    <span>{pack.price} ₪</span>
                    <span>{pack.tickets} Tickets</span>
                    {pack.bonus && <span>+ {pack.bonus}</span>}
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => {setEditingPackId(pack.id); setPackForm(pack);}} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg"><i className="fas fa-edit"></i></button>
                  <button onClick={() => deletePack(pack.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"><i className="fas fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'prizes' && (
        <div className="space-y-6">
          <div className="card-glass p-6 rounded-2xl">
            <h3 className="text-xl font-bold mb-4">Nouveau Lot</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Nom du lot" value={newPrizeName} onChange={(e) => setNewPrizeName(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" />
                <input type="text" placeholder="URL Image" value={newPrizeImg} onChange={(e) => setNewPrizeImg(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" />
                <button onClick={addPrize} className="md:col-span-2 btn-gold py-3 rounded-xl font-bold">Ajouter le lot</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prizes.map(prize => (
              <div key={prize.id} className="card-glass p-4 rounded-2xl flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <img src={prize.image} className="w-12 h-12 rounded-xl object-cover" />
                  <div className="font-bold text-white">{prize.name}</div>
                </div>
                <button onClick={() => deletePrize(prize.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 p-2"><i className="fas fa-trash"></i></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-xl">
          <div className="card-glass p-8 rounded-3xl border-t-2 border-amber-500/30">
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3"><i className="fas fa-coins text-amber-500"></i> Règles de Prix</h3>
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span>Activer les Packs</span>
                  <button onClick={() => updateGlobalSettings({ enablePacks: !settings.enablePacks })}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings.enablePacks ? 'bg-amber-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.enablePacks ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span>Activer la Quantité Libre</span>
                  <button onClick={() => updateGlobalSettings({ enableFreeQty: !settings.enableFreeQty })}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings.enableFreeQty ? 'bg-amber-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.enableFreeQty ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-2">Prix unitaire d'un ticket (₪)</label>
                    <div className="relative">
                        <input type="number" value={settings.unitPrice} onChange={(e) => updateGlobalSettings({ unitPrice: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-3xl font-bold text-amber-300 outline-none focus:ring-2 focus:ring-amber-500" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-slate-500">₪</span>
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-2">Max tickets / personne (Libre)</label>
                    <input type="number" value={settings.maxTickets} onChange={(e) => updateGlobalSettings({ maxTickets: parseInt(e.target.value) || 1 })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xl text-white outline-none" />
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
