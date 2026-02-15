export interface Winner {
  id: string;
  ticketNumber: string;
  name: string;
  prize: string;
  wonAt: any; // Timestamp Firestore
}

export interface AppSettings {
  title: string;
  primaryColor: string;
  backgroundColor: string;
  logoUrl?: string;
}

export interface DrawStatus {
  state: 'idle' | 'rolling' | 'winner'; // 'idle' (rien), 'rolling' (roulement tambour), 'winner' (gagnant affiché)
  currentWinner?: Winner | null;
}
