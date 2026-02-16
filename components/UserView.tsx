import React, { useState } from 'react';
import { Prize, AppSettings, DrawRecord, TicketPack, Participant } from '../types';

// --- CONFIGURATION DU PAIEMENT ---

// 1. Configuration BIT
const BIT_PHONE = "058-522-0894"; // <--- Numéro pour BIT
const BIT_APP_LINK = "https://www.bitpay.co.il"; // Lien générique vers l'app

// 2. Configuration PAYBOX
const PAYBOX_PHONE = "058-644-6279"; // <--- Numéro pour PAYBOX (Différent)
const PAYBOX_PERSONAL_LINK = "https://links.payboxapp.com/xd6m6TIvMUb"; // <--- Ton lien DIRECT PayBox ici


interface UserViewProps {
  prizes: Prize[];
  settings: AppSettings;
  ticketPacks: TicketPack[];
  drawHistory: DrawRecord[];
  onJoin: (data: Omit<Participant, 'id' | 'timestamp'>) => void;
}

const UserView: React.FC<UserViewProps> = ({ prizes, settings, ticketPacks, drawHistory, onJoin }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purchaseMode, setPurchaseMode] = useState<'pack' | 'unit' | null>(null);
  const [selectedPack, setSelectedPack] = useState<TicketPack | null>(null);
  const [tickets, setTickets] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  const finalTickets = purchaseMode === 'pack' ? (selectedPack?.tickets || 0) : tickets;
  const finalAmount = purchaseMode === 'pack' ? (selectedPack?.price || 0) : (tickets * settings.unitPrice);

  const handleNext = () => {
    if (step === 1 && purchaseMode) {
      if (purchaseMode === 'pack' && !selectedPack) return;
      if (purchaseMode === 'unit' && (tickets < 1 || finalAmount <= 0)) return;
      setStep(2);
    }
    else if (step === 2 && name.trim() && phone.trim()) {
        setStep(3);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !purchaseMode) return;
    
    const safeTickets = Number(finalTickets);
    const safeAmount = Number(finalAmount);

    if (safeTickets < 1 || safeAmount <= 0) {
      alert("Veuillez sélectionner au moins un ticket.");
      return;
    }

    const participantData: any = {
      name: name.trim(),
      phone: phone.trim(),
      tickets: safeTickets,
      totalAmount: safeAmount,
      mode: purchaseMode
    };

    if (purchaseMode === 'pack' && selectedPack) {
      participantData.packLabel = selectedPack.label;
    }

    onJoin(participantData);
    setIsSuccess(true);
  };

  const handleReset = () => {
      setName('');
      setPhone('');
      setPurchaseMode(null);
      setSelectedPack(null);
      setTickets(1);
      setStep(1);
      setIsSuccess(false);
  };

  const increment = () => setTickets(prev => Math.min(prev + 1, settings.maxTickets));
  const decrement = () => setTickets(prev => Math.max(prev - 1, 1));

  // --- ÉCRAN DE SUCCÈS ---
  if (isSuccess) {
      return (
        <div className="flex flex-col items-center justify-center pt-10 pb-20 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                <i className="fas fa-check text-4xl text-slate-900"></i>
            </div>
            
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-festive text-white">Mazal Tov !</h2>
                <p className="text-slate-300">Votre participation est bien enregistrée.</p>
                <div className="bg-white/10 px-6 py-2 rounded-full inline-block mt-4">
                    <span className="text-amber-400 font-bold text-xl">Ticket #{Math.floor(Math.random()*1000)+1000}</span>
                </div>
            </div>

            {/* --- BLOC PAIEMENT SÉPARÉ --- */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center space-y-8">
                <div>
                    <h3 className="text-xl font-bold text-amber-200 mb-2">Finaliser le don</h3>
                    <p className="text-slate-300 text-sm">
                        Montant à régler : <strong className="text-white text-lg">{finalAmount} ₪</strong>
                    </p>
                </div>
                
                {/* OPTION 1 : BIT */}
                <div className="space-y-3 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-blue-400 font-bold italic text-xl">bit</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider ml-auto">Option 1</span>
                    </div>
                    {/* Bouton Copier pour Bit */}
                    <button 
                        onClick={() => { navigator.clipboard.writeText(BIT_PHONE); alert(`Numéro BIT (${BIT_PHONE}) copié !`); }}
                        className="w-full bg-slate-800 hover:bg-slate-700 border border-white/10 text-white py-2 rounded-xl flex items-center justify-between px-4 transition-all text-sm"
                    >
                        <span className="font-mono text-slate-300">{BIT_PHONE}</span>
                        <span className="text-xs text-blue-300 flex items-center gap-1"><i className="fas fa-copy"></i> Copier</span>
                    </button>
                    {/* Bouton Ouvrir Bit */}
                    <a href={BIT_APP_LINK} target="_blank" rel="noopener noreferrer" 
                       className="block w-full bg-[#0073e6] hover:bg-[#0060c0] text-white py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                       <span>Ouvrir l'appli Bit</span>
                    </a>
                </div>

                {/* OPTION 2 : PAYBOX */}
                <div className="space-y-3 p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-cyan-400 font-bold text-xl">PayBox</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider ml-auto">Option 2</span>
                    </div>
                     {/* Bouton Copier pour PayBox */}
                     <button 
                        onClick={() => { navigator.clipboard.writeText(PAYBOX_PHONE); alert(`Numéro PAYBOX (${PAYBOX_PHONE}) copié !`); }}
                        className="w-full bg-slate-800 hover:bg-slate-700 border border-white/10 text-white py-2 rounded-xl flex items-center justify-between px-4 transition-all text-sm"
                    >
                        <span className="font-mono text-slate-300">{PAYBOX_PHONE}</span>
                        <span className="text-xs text-cyan-300 flex items-center gap-1"><i className="fas fa-copy"></i> Copier</span>
                    </button>
                    {/* Bouton Lien Direct PayBox */}
                    <a href={PAYBOX_PERSONAL_LINK} target="_blank" rel="noopener noreferrer" 
                       className="block w-full bg-[#00c2ff] hover:bg-[#00a0d6] text-slate-900 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                       <span>Payer via mon Lien</span> <i className="fas fa-external-link-alt"></i>
                    </a>
                </div>

            </div>
            {/* ----------------------------- */}

            <button onClick={handleReset} className="text-slate-500 hover:text-white underline transition-colors">
                Retour à l'accueil
            </button>
        </div>
      );
  }

  return (
    <div className="space-y-12">
      <section className="text-center space-y-4 pt-8">
        <h1 className="text-5xl md:text-7xl font-festive glow-gold text-amber-200 animate-float">Tentez votre chance !</h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">Soutenez-nous et gagnez des lots incroyables.</p>
      </section>

      <section className="card-glass p-6 md:p-10 rounded-[40px] max-w-2xl mx-auto shadow-2xl relative overflow-hidden border border-white/10">
        <div className="flex justify-between items-center mb-10 max-w-xs mx-auto relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -translate-y-1/2 z-0"></div>
            {[1, 2, 3].map(num => (
                <div key={num} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500 ${step >= num ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>
                    {step > num ? <i className="fas fa-check"></i> : num}
                </div>
            ))}
        </div>

        {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-8">
                <h3 className="text-2xl font-bold text-center">Étape 1 : Votre Choix 🎁</h3>
                
                {settings.enablePacks && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {ticketPacks.map(pack => (
                            <div key={pack.id} onClick={() => { setPurchaseMode('pack'); setSelectedPack(pack); }}
                                className={`p-6 rounded-3xl cursor-pointer border-2 transition-all relative overflow-hidden ${selectedPack?.id === pack.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}>
                                <div className="text-amber-300 font-bold text-2xl mb-1">{pack.price} ₪</div>
                                <div className="text-xl font-bold text-white mb-2">{pack.label}</div>
                                <div className="text-slate-400 text-sm flex items-center gap-2">
                                    <i className="fas fa-ticket-alt"></i> {pack.tickets} Tickets {pack.bonus && <span className="text-pink-400">+ {pack.bonus}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {settings.enableFreeQty && (
                    <div onClick={() => { setPurchaseMode('unit'); setSelectedPack(null); }}
                        className={`p-6 rounded-3xl cursor-pointer border-2 transition-all ${purchaseMode === 'unit' ? 'border-amber-400 bg-amber-400/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xl font-bold">Quantité Libre 🔢</h4>
                            <span className="text-amber-400 font-bold">{settings.unitPrice} ₪ / ticket</span>
                        </div>
                        {purchaseMode === 'unit' && (
                            <div className="flex items-center justify-center gap-4 mt-4 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                <button onClick={decrement} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all">-</button>
                                <input 
                                  type="number" 
                                  value={tickets} 
                                  onChange={(e) => setTickets(Math.max(1, Math.min(parseInt(e.target.value) || 1, settings.maxTickets)))}
                                  className="bg-transparent text-3xl font-bold text-center w-16 border-b border-amber-500/50 outline-none text-white" 
                                />
                                <button onClick={increment} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all">+</button>
                            </div>
                        )}
                        {purchaseMode === 'unit' && <div className="text-center mt-4 text-amber-200 font-bold">Total: {tickets * settings.unitPrice} ₪</div>}
                    </div>
                )}

                <button disabled={!purchaseMode} onClick={handleNext} className="w-full btn-gold py-4 rounded-2xl font-bold uppercase disabled:opacity-50">Continuer <i className="fas fa-arrow-right ml-2"></i></button>
            </div>
        )}

        {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                <h3 className="text-2xl font-bold text-center">Étape 2 : Vos coordonnées ✍️</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-slate-400 mb-2 text-sm">Nom complet</label>
                        <input type="text" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: David Cohen"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500 text-white text-lg" />
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-sm">Numéro de téléphone</label>
                        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: 050-123-4567"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500 text-white text-lg" />
                    </div>
                </div>
                <div className="flex gap-4 pt-4">
                    <button onClick={handleBack} className="flex-1 bg-white/5 text-white py-4 rounded-2xl font-bold">Retour</button>
                    <button disabled={!name.trim() || !phone.trim()} onClick={handleNext} className="flex-[2] btn-gold py-4 rounded-2xl font-bold uppercase disabled:opacity-50">Récapitulatif <i className="fas fa-arrow-right ml-2"></i></button>
                </div>
            </div>
        )}

        {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-center">
                <h3 className="text-2xl font-bold mb-6">Récapitulatif 🧐</h3>
                <div className="bg-white/5 rounded-3xl p-8 mb-8 border border-white/10 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <span className="text-slate-400">Nom :</span> <span className="font-bold text-xl">{name}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <span className="text-slate-400">Tél :</span> <span className="font-bold text-xl">{phone}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <span className="text-slate-400">Mode :</span> <span className="font-bold text-amber-300">{purchaseMode === 'pack' ? `Pack ${selectedPack?.label}` : 'Quantité Libre'}</span>
                    </div>
                    <div className="flex justify-between items-center text-2xl pt-2">
                        <span className="text-slate-400">Total :</span> <span className="font-bold text-amber-400">{finalAmount} ₪ ({finalTickets} tickets)</span>
                    </div>
                </div>
                
                <div className="text-sm text-slate-400 mb-6 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    <i className="fas fa-info-circle mr-2"></i>
                    Les liens de paiement (Bit / PayBox) s'afficheront après validation.
                </div>

                <div className="flex gap-4">
                    <button onClick={handleBack} className="flex-1 bg-white/5 text-white py-4 rounded-2xl font-bold">Retour</button>
                    <button onClick={handleSubmit} className="flex-[2] btn-gold py-4 rounded-2xl font-bold uppercase text-lg shadow-lg">
                        Valider ma participation 🎉
                    </button>
                </div>
            </div>
        )}
      </section>

      <section>
        <h2 className="text-3xl font-festive mb-8 text-center text-amber-100 flex items-center justify-center gap-4">
          <div className="h-[2px] w-12 bg-amber-500/50"></div>Lots à gagner<div className="h-[2px] w-12 bg-amber-500/50"></div>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prizes.filter(p => p.active).map((prize) => (
            <div key={prize.id} className="group card-glass rounded-2xl overflow-hidden hover:-translate-y-2 transition-all duration-300 shadow-xl">
              <div className="h-48 overflow-hidden bg-slate-800 flex items-center justify-center relative">
                <img src={prize.image || `https://picsum.photos/seed/${prize.id}/400/300`} alt={prize.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">{prize.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {drawHistory.length > 0 && (
        <section className="bg-amber-400/5 border border-amber-400/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-amber-200 flex items-center gap-3"><i className="fas fa-crown"></i> Mur des Gagnants</h2>
            <div className="flex flex-wrap gap-4">
                {drawHistory.sort((a,b) => b.timestamp - a.timestamp).map((h) => (
                    <div key={h.id} className="bg-white/10 px-4 py-2 rounded-full flex items-center gap-3 border border-white/10">
                        <span className="font-bold text-amber-400">{h.winner}</span>
                        <span className="text-slate-400 text-xs">a gagné</span>
                        <span className="text-white text-sm">{h.prize}</span>
                    </div>
                ))}
            </div>
        </section>
      )}
    </div>
  );
};

export default UserView;
