
export interface TicketPackage {
  id: string;
  name: string;
  description: string;
  ticketCount: number;
}

export interface Participant {
  id: string;
  name: string;
  packageId: string;
  totalTickets: number;
  purchasedAt: number;
}

export interface Prize {
  id: string;
  name: string;
  description: string;
  winnerId?: string;
  order: number;
}

export type AppRole = 'ADMIN' | 'GUEST';
export type AppView = 'DASHBOARD' | 'SETTINGS' | 'PARTICIPANTS' | 'DRAW' | 'GUEST_REGISTER';
