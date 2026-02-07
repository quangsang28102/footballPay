'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAdmin: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
  updatePin: (newPin: string) => void;
  getRawPin: () => string; // Only for settings
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = 'fb_adm_tkn'; // Obfuscated key name
const PIN_KEY = 'fb_adm_sec'; // Obfuscated key name
const DEFAULT_PIN = '1234';
const SALT = 'football_secret_2024';

// Simple obfuscation helper
const encrypt = (str: string) => btoa(SALT + str);
const decrypt = (str: string) => {
  try {
    const combined = atob(str);
    return combined.replace(SALT, '');
  } catch (e) {
    return DEFAULT_PIN;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedPin = localStorage.getItem(PIN_KEY) || encrypt(DEFAULT_PIN);
    const savedToken = localStorage.getItem(AUTH_KEY);
    
    if (savedToken && savedToken === savedPin) {
      setIsAdmin(true);
    }
    setIsLoading(false);

    // Sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PIN_KEY || e.key === AUTH_KEY) {
        const currentPin = localStorage.getItem(PIN_KEY) || encrypt(DEFAULT_PIN);
        const currentToken = localStorage.getItem(AUTH_KEY);
        
        if (currentToken && currentToken === currentPin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const isAdminRoute = pathname !== '/member' && pathname !== '/login';
    if (!isLoading && isAdminRoute && !isAdmin) {
      router.push('/member');
    }
  }, [isAdmin, pathname, isLoading, router]);

  const login = (pin: string) => {
    const savedPin = localStorage.getItem(PIN_KEY) || encrypt(DEFAULT_PIN);
    if (encrypt(pin) === savedPin) {
      setIsAdmin(true);
      localStorage.setItem(AUTH_KEY, savedPin);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    localStorage.removeItem(AUTH_KEY);
    router.push('/member');
  };

  const updatePin = (newPin: string) => {
    const encrypted = encrypt(newPin);
    localStorage.setItem(PIN_KEY, encrypted);
    // If logged in, update the token too
    if (isAdmin) {
      localStorage.setItem(AUTH_KEY, encrypted);
    }
  };

  const getRawPin = () => {
    const savedPin = localStorage.getItem(PIN_KEY) || encrypt(DEFAULT_PIN);
    return decrypt(savedPin);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout, updatePin, getRawPin }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
