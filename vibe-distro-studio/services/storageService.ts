import { Session } from '../types';

const STORAGE_KEY = 'studio_sessions_db';

export const getSessions = (): Session[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading from storage", error);
    return [];
  }
};

export const saveSession = (session: Session): void => {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === session.id);

  if (index >= 0) {
    // Update existing
    sessions[index] = session;
  } else {
    // Create new (add to top)
    sessions.unshift(session);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const deleteSession = (id: string): void => {
  const sessions = getSessions();
  const updatedSessions = sessions.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
};

export const clearSessions = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};