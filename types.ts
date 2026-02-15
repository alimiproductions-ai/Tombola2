
export interface Participant {
  id: string;
  name: string;
  tickets: number;
  totalAmount: number;
  mode: 'pack' | 'unit';
  packLabel?: string;
  timestamp: number;
  createdAt?: number; // Nouveau champ pour le suivi
}

export interface Prize {
  id: string;
  name: string;
  image: string;
  active: boolean;
}

export interface TicketPack {
  id: string;
  label: string;
  description: string;
  price: number;
  bonus: string;
  tickets: number;
}

export interface AppSettings {
  unitPrice: number;
  maxTickets: number;
  enablePacks: boolean;
  enableFreeQty: boolean;
}

export interface DrawRecord {
  id: string;
  winner: string;
  prize: string;
  timestamp: number;
}

export type AppView = 'home' | 'admin';
