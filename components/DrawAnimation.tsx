
import React, { useState, useEffect, useRef } from 'react';
import { Prize, Participant } from '../types';
import confetti from 'canvas-confetti';

interface DrawAnimationProps {
  prize: Prize;
  participants: Participant[];
  onFinish: (winnerName: string, prizeName: string) => void;
  onCancel: () => void;
}

const DrawAnimation: React.FC<DrawAnimationProps> = ({ prize, participants, onFinish, onCancel }) => {
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'finished'>('idle');
  const [currentName, setCurrentName] = useState('Prêt ?');
  const [winner, setWinner] = useState<Participant | null>(null);
  const rollIntervalRef = useRef<number | null>(null);

  // Weighted pool based on tickets
  const pool: Participant[] = [];
  participants.forEach(p => {
    for (let i = 0; i < p.tickets; i++) {
      pool.push(p);
    }
  });

  const startDraw = () => {
    if (pool.length === 0) return;
    setPhase('rolling');
    
    // Simulate suspenseful rolling
    let counter = 0;
    const maxRolls = 30;
    const baseInterval = 50;

    const roll = () => {
      const randomIndex = Math.floor(Math.random() * pool.length);
      setCurrentName(pool[randomIndex].name);
      counter++;

      if (counter < maxRolls) {
        // Slow down near the end
        const nextInterval = baseInterval + (counter * 10);
        rollIntervalRef.current = window.setTimeout(roll, nextInterval);
      } else {
        // Final winner
        const winIdx = Math.floor(Math.random() * pool.length);
        const winObj = pool[winIdx];
        setWinner(winObj);
        setCurrentName(winObj.name);
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
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) clearTimeout(rollIntervalRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/20 rounded-full blur-[120px]"></div>
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 md:p-12 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <button 
                onClick={onCancel}
                className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
                <i className="fas fa-times text-xl"></i>
            </button>

            <div className="mb-8">
                <div className="inline-block px-4 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm font-bold uppercase tracking-widest mb-4">
                    Tirage en cours
                </div>
                <h2 className="text-3xl md:text-4xl font-festive text-white mb-2">{prize.name}</h2>
                <div className="w-24 h-1 bg-amber-500 mx-auto rounded-full opacity-50"></div>
            </div>

            <div className="h-64 flex flex-col items-center justify-center space-y-8">
                {phase === 'idle' ? (
                    <div className="space-y-6">
                        <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center border-4 border-amber-500/30 animate-pulse">
                            <i className="fas fa-gift text-4xl text-amber-400"></i>
                        </div>
                        <button 
                            onClick={startDraw}
                            className="btn-gold px-12 py-4 rounded-full font-bold text-xl uppercase tracking-tighter"
                        >
                            Lancer le tambour !
                        </button>
                    </div>
                ) : (
                    <div className={`transition-all duration-300 ${phase === 'finished' ? 'scale-110' : ''}`}>
                        <div className="text-slate-400 text-sm mb-4">Et le gagnant est...</div>
                        <div className={`text-5xl md:text-7xl font-festive glow-gold bg-clip-text text-transparent bg-gradient-to-b from-amber-200 to-amber-500 px-4 py-2 ${phase === 'rolling' ? 'opacity-70 blur-[1px]' : 'animate-bounce'}`}>
                            {currentName}
                        </div>
                    </div>
                )}
            </div>

            {phase === 'finished' && (
                <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button 
                        onClick={() => onFinish(winner?.name || 'Inconnu', prize.name)}
                        className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all shadow-xl"
                    >
                        Terminer et Enregistrer
                    </button>
                </div>
            )}

            <div className="absolute bottom-8 left-0 right-0 text-slate-500 text-xs font-medium">
                Pool de {pool.length} tickets • {participants.length} participants
            </div>
        </div>
    </div>
  );
};

export default DrawAnimation;
