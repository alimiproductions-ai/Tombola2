
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
  const [activeDraw, setActiveDraw] = useState<{ prize: Prize } | null>(null);

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
          phone: val.phone || 'Non renseigné', // <-- AJOUTEZ CETTE LIGNE
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
  }, []);

  const handleAddParticipant = async (participantData: Omit<Participant, 'id' | 'timestamp'>) => {
    const now = Date.now();
    
    // Construction manuelle pour éviter les champs 'undefined' que Firebase refuse
    const newParticipant: any = {
      name: participantData.name,
      mode: participantData.mode,
      tickets: Number(participantData.tickets),
      totalAmount: Number(participantData.totalAmount),
      timestamp: now,
      createdAt: now
    };

    // N'ajouter packLabel que s'il est défini
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

  const handleDrawFinish = async (winnerName: string, prizeName: string) => {
    const record: Omit<DrawRecord, 'id'> = {
      winner: winnerName,
      prize: prizeName,
      timestamp: Date.now()
    };
    await push(ref(db, 'drawHistory'), record);
    setActiveDraw(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 overflow-x-hidden pb-10">
      <Navbar currentView={view} setView={setView} isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
      
      <main className="max-w-5xl mx-auto px-4 pt-24">
        {activeDraw ? (
          <DrawAnimation 
            prize={activeDraw.prize} 
            participants={participants} 
            onFinish={handleDrawFinish}
            onCancel={() => setActiveDraw(null)}
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
            onDraw={(prize) => setActiveDraw({ prize })}
          />
        )}
      </main>

      <footer className="mt-20 text-center text-slate-500 text-sm">
        <p>© 2024 Tombola Festive • La joie d'Adar</p>
      </footer>
    </div>
  );
};

export default App;
