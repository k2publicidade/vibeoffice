
export type SessionType = 'Gravacao' | 'Mix/Master' | 'Edicao' | 'Producao';

export type UserRole = 'ADMIN' | 'USER';

export interface Person {
  id: string;
  name: string; // "Nome completo" for composers
  phone?: string; // Changed from generic contact
  email?: string; // New field
  contactRole?: string; // Role or name of the contact person (e.g. A&R, Manager)
  // Legacy support for older records before migration
  contact?: string; 
}

export interface Session {
  id: string;
  trackTitle: string; // Title of the track
  studio: string; // Name of the studio facility
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  producers: Person[];
  artists: Person[];
  composers: Person[];
  pc: string; // Workstation ID
  type: SessionType[]; // Multi-select
  createdAt: number;
  createdBy: string; // Email of the user who created the session
  notes?: string;
}

export interface StatsData {
  name: string;
  value: number;
}
