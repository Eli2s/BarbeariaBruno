import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
}

const ADMIN_PIN = '1234';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      login: (pin: string) => {
        if (pin === ADMIN_PIN) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // nome da key no localStorage
    }
  )
);
