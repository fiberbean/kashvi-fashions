import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export interface CustomerProfile {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string | null;
  mobile: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  customer: CustomerProfile | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchCustomerProfile = async (authUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (!error && data) {
        setCustomer(data);
      }
    } catch (err) {
      console.error('Error fetching customer record:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCustomerProfile(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCustomerProfile(session.user.id);
      } else {
        setCustomer(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setCustomer(null);
  };

  const refreshCustomer = async () => {
    if (user) await fetchCustomerProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        customer,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        signOut,
        refreshCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};