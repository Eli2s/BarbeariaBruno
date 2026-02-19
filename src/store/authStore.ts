import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
}

const ADMIN_PIN = '1234';

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  login: (pin: string) => {
    if (pin === ADMIN_PIN) {
      set({ isAuthenticated: true });
      return true;
    }
    return false;
  },
  logout: () => set({ isAuthenticated: false }),
}));
