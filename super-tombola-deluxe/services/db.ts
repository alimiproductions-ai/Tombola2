
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  addDoc, 
  deleteDoc, 
  getDocs,
  query,
  orderBy
} from "firebase/firestore";

// Cette configuration sera injectée depuis App.tsx
let db: any;

export const initFirebase = (config: any) => {
  const app = initializeApp(config);
  db = getFirestore(app);
};

export const syncService = {
  // Sauvegarde des réglages (Packs et Lots)
  saveSettings: async (type: 'packages' | 'prizes', data: any[]) => {
    if (!db) return;
    await setDoc(doc(db, "config", type), { items: data });
  },

  // Écoute les réglages en temps réel
  subscribeToSettings: (type: 'packages' | 'prizes', callback: (data: any[]) => void) => {
    if (!db) return () => {};
    return onSnapshot(doc(db, "config", type), (doc) => {
      if (doc.exists()) {
        callback(doc.data().items);
      }
    });
  },

  // Gestion des participants
  addParticipant: async (participant: any) => {
    if (!db) return;
    await addDoc(collection(db, "participants"), participant);
  },

  subscribeToParticipants: (callback: (data: any[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "participants"), orderBy("purchasedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const participants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(participants as any[]);
    });
  },

  deleteParticipant: async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, "participants", id));
  },

  // Réinitialisation totale
  clearAllParticipants: async () => {
    if (!db) return;
    const snapshot = await getDocs(collection(db, "participants"));
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  }
};
