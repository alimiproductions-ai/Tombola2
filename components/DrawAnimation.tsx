import React, { useState, useEffect, useRef } from 'react';
import { Prize, Participant } from '../types';
import confetti from 'canvas-confetti';

interface DrawAnimationProps {
  prize: Prize;
  participants: Participant[];
  forcedWinner: Participant;
  onFinish: (winnerName: string, prizeName: string) => void;
  onCancel: () => void;
  isAdmin: boolean;
}

const DrawAnimation: React.FC<DrawAnimationProps> = ({ prize, participants, forcedWinner, onFinish, onCancel, isAdmin }) => {
  const [phase, setPhase] = useState<'rolling' | 'finished'>('rolling');
  const [currentName, setCurrentName] = useState('...');
  const rollIntervalRef = useRef<number | null>(null);

  // Pool visuel uniquement
  const displayPool = participants.length > 0 ? participants : [{name: 'Personne', id: '0'} as any];

  useEffect(() => {
    startAnimation();
    return () => {
      if (rollIntervalRef.current) clearTimeout(rollIntervalRef.current);
    };
  }, []);

  const startAnimation = () => {
    let counter = 0;
    const maxRolls = 40; 
    const baseInterval = 50;

    const roll = () => {
      const randomIndex = Math.floor(Math.random() * displayPool.length);
      setCurrentName(displayPool[randomIndex].name);
      
      counter++;

      if (counter < maxRolls) {
        const nextInterval = baseInterval + (counter * 12);
        rollIntervalRef.current = window.setTimeout(roll, nextInterval);
      } else {
        // Fin de l'animation : on affiche le vrai gagnant
        setCurrentName(forcedWinner.name);
        setPhase('finished');
        triggerConfetti();
      }
    };
    roll();
  };

  const triggerConfetti = () => {
    const end = Date.now() + (3 * 1000);
    const colors = ['#fbbf24', '#f472b6', '#ffffff'];

    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/20 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 md:p-12 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            
            {/* CORRECTION ICI : La croix est visible pour TOUT LE MONDE */}
            <button 
                onClick={onCancel}
                className="absolute top-6 right-6 text-slate-400 hover:text-white bg-white/10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-rose-500"
                title="Fermer la fenêtre"
            >
                <i className="fas fa-times text-lg"></i>
            </button>

            <div className="mb-8">
                <div className="inline-block px-4 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm font-bold uppercase tracking-widest mb-4">
                    Tirage en cours
                </div>
                <h2 className="text-3xl md:text-4xl font-festive text-white mb-2">{prize.name}</h2>
                <div className="w-24 h-1 bg-amber-500 mx-auto rounded-full opacity-50"></div>
            </div>

            <div className="h-64 flex flex-col items-center justify-center space-y-8">
                <div className={`transition-all duration-300 ${phase === 'finished' ? 'scale-110' : ''}`}>
                    <div className="text-slate-400 text-sm mb-4">
                        {phase === 'rolling' ? 'Suspense...' : 'Et le gagnant est...'}
                    </div>
                    <div className={`text-5xl md:text-7xl font-festive glow-gold bg-clip-text text-transparent bg-gradient-to-b from-amber-200 to-amber-500 px-4 py-2 ${phase === 'rolling' ? 'opacity-70 blur-[1px]' : 'animate-bounce'}`}>
                        {currentName}
                    </div>
                    {phase === 'finished' && (
                         <div className="text-emerald-400 font-bold mt-2 animate-in fade-in zoom-in duration-500">
                             {forcedWinner.phone && forcedWinner.phone !== 'Non renseigné' ? forcedWinner.phone : ''}
                         </div>
                    )}
                </div>
            </div>

            {/* Bouton Admin pour valider officiellement */}
            {phase === 'finished' && isAdmin && (
                <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button 
                        onClick={() => onFinish(forcedWinner.name, prize.name)}
                        className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all shadow-xl"
                    >
                        Terminer et Enregistrer
                    </button>
                </div>
            )}
            
            {/* Bouton de secours pour user bloqué */}
            {phase === 'finished' && !isAdmin && (
                <div className="mt-12">
                    <button onClick={onCancel} className="text-slate-500 hover:text-white underline text-sm">
                        Fermer cet écran
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default DrawAnimation;
