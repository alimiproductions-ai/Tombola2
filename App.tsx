import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from './firebase';
import { Participant, Prize, AppSettings, DrawRecord, AppView, TicketPack } from './types';
import AdminDashboard from './components/AdminDashboard';
import UserView from './components/UserView';
import Navbar from './components/Navbar';
import DrawAnimation from './components/DrawAnimation';
import confetti from 'canvas-confetti';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [ticketPacks, setTicketPacks] = useState<TicketPack[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ 
    unitPrice: 10, 
    maxTickets: 100,
    enablePacks: true,
    enableFreeQty: true
  });
  const [drawHistory, setDrawHistory] = useState<DrawRecord[]>([]);
  
  // MODIFICATION : activeDraw contient maintenant le gagnant aussi
  const [activeDraw, setActiveDraw] = useState<{ prize: Prize, winner: Participant } | null>(null);

  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
      console.warn("Firebase Auth Error:", error.message);
    });

    const settingsRef = ref(db, 'settings');
    onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings({
          unitPrice: data.unitPrice ?? 10,
          maxTickets: data.maxTickets ?? 100,
          enablePacks: data.enablePacks ?? true,
          enableFreeQty: data.enableFreeQty ?? true
        });
      } else {
        set(settingsRef, { unitPrice: 10, maxTickets: 100, enablePacks: true, enableFreeQty: true });
      }
    });

    const participantsRef = ref(db, 'participants');
    onValue(participantsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          name: val.name || 'Anonyme',
          phone: val.phone || 'Non renseigné',
          tickets: Number(val.tickets) || 0,
          totalAmount: Number(val.totalAmount) || 0,
          mode: val.mode || 'unit',
          packLabel: val.packLabel,
          timestamp: val.timestamp || val.createdAt || Date.now(),
          createdAt: val.createdAt || val.timestamp
        }));
        setParticipants(list);
      } else {
        setParticipants([]);
      }
    });

    const packsRef = ref(db, 'ticketPacks');
    onValue(packsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
        }));
        list.sort((a, b) => a.price - b.price); 
        setTicketPacks(list);
      } else {
        setTicketPacks([]);
      }
    });

    const prizesRef = ref(db, 'prizes');
    onValue(prizesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
        }));
        setPrizes(list);
      } else {
        setPrizes([]);
      }
    });

    const historyRef = ref(db, 'drawHistory');
    onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
        }));
        setDrawHistory(list);
      } else {
        setDrawHistory([]);
      }
    });

    // --- LIVE SYNC LISTENER ---
    // C'est ici que tous les appareils détectent qu'un tirage commence
    const liveDrawRef = ref(db, 'activeDraw');
    onValue(liveDrawRef, (snapshot) => {
        const data = snapshot.val();
        setActiveDraw(data); // Si null, l'animation s'arrête. Si objet, elle commence.
    });

  }, []);

  const handleAddParticipant = async (participantData: Omit<Participant, 'id' | 'timestamp'>) => {
    const now = Date.now();
    const newParticipant: any = {
      name: participantData.name,
      phone: participantData.phone || 'Non renseigné',
      mode: participantData.mode,
      tickets: Number(participantData.tickets),
      totalAmount: Number(participantData.totalAmount),
      timestamp: now,
      createdAt: now
    };

    if (participantData.packLabel) {
      newParticipant.packLabel = participantData.packLabel;
    }

    try {
      await push(ref(db, 'participants'), newParticipant);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#4c1d95', '#f472b6']
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout du participant:", error);
      alert("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
    }
  };

  // --- START DRAW (ADMIN ONLY) ---
  // Calcul du gagnant et envoi à Firebase pour synchronisation
  const handleStartDraw = async (prize: Prize) => {
    const eligible = participants.filter(p => p.tickets > 0);
    if (eligible.length === 0) {
        alert("Aucun participant avec des tickets !");
        return;
    }

    // Weighted Random Logic
    let ticketPool: Participant[] = [];
    eligible.forEach(p => {
        for(let i=0; i < p.tickets; i++) {
            ticketPool.push(p);
        }
    });
    // Shuffle
    ticketPool = ticketPool.sort(() => Math.random() - 0.5);
    
    // Pick Winner
    const winnerIndex = Math.floor(Math.random() * ticketPool.length);
    const winner = ticketPool[winnerIndex];

    // Broadcast to Firebase
    await set(ref(db, 'activeDraw'), {
        prize: prize,
        winner: winner,
        timestamp: Date.now()
    });
  };

  // --- FINISH DRAW (ADMIN ONLY) ---
  const handleDrawFinish = async (winnerName?: string, prizeName?: string) => {
    // Si appelé depuis DrawAnimation, on utilise les params, sinon on prend activeDraw
    const wName = winnerName || activeDraw?.winner.name;
    const pName = prizeName || activeDraw?.prize.name;

    if (isAdmin && wName && pName) {
      const record: Omit<DrawRecord, 'id'> = {
        winner: wName,
        prize: pName,
        timestamp: Date.now()
      };
      await push(ref(db, 'drawHistory'), record);
      
      // Stop animation for everyone
      await remove(ref(db, 'activeDraw'));
    }
  };

  // User close (local only if not admin, but ideally waits for admin)
// --- Modifie cette fonction dans App.tsx ---
  const handleUserClose = () => {
      if (isAdmin) {
          // Si je suis admin, je supprime de la DB (ferme pour tout le monde)
          handleDrawFinish(); 
      } else {
          // Si je suis user (ou bloqué), je ferme juste MON écran
          setActiveDraw(null); 
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 overflow-x-hidden pb-10">
      <Navbar currentView={view} setView={setView} isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
      
      <main className="max-w-5xl mx-auto px-4 pt-24">
        {activeDraw ? (
          <DrawAnimation 
            prize={activeDraw.prize} 
            participants={participants} 
            forcedWinner={activeDraw.winner} // On passe le gagnant décidé par l'admin
            onFinish={handleDrawFinish}
            onCancel={handleUserClose}
            isAdmin={isAdmin} // Pour afficher le bouton "Terminer" uniquement à l'admin
          />
        ) : view === 'home' ? (
          <UserView 
            prizes={prizes} 
            settings={settings}
            ticketPacks={ticketPacks}
            onJoin={handleAddParticipant} 
            drawHistory={drawHistory}
          />
        ) : (
          <AdminDashboard 
            participants={participants} 
            prizes={prizes} 
            settings={settings}
            ticketPacks={ticketPacks}
            drawHistory={drawHistory}
            onDraw={handleStartDraw} // Utilise la nouvelle fonction start
          />
        )}
      </main>

      <footer className="mt-20 text-center text-slate-500 text-sm">
        <p>© 2026 Tombola Festive • La joie d'Adar</p>
      </footer>
    </div>
  );
};

export default App;
