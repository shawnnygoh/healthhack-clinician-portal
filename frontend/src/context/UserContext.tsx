'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getUserMetadata } from '@/lib/services/user';
import { Auth0User, UserMetadata, UserContextUpdate } from '@/types/user';

type UserContextType = {
  userData: Auth0User | null;
  userMetadata: UserMetadata | null;
  isLoading: boolean;
  refreshUserData: () => Promise<void>;
  updateLocalUserData: (updates: UserContextUpdate) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

// Create a local storage key for storing updated user info
const USER_INFO_STORAGE_KEY = 'healthhack_user_overrides';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isUserLoading } = useUser();
  const [userData, setUserData] = useState<Auth0User | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data and apply any local overrides
  useEffect(() => {
    if (user?.sub && !isUserLoading) {
      // First get the base user from Auth0
      let effectiveUser: Auth0User = { ...user as Auth0User };
      
      // Then try to apply any local overrides
      try {
        const storedOverrides = localStorage.getItem(USER_INFO_STORAGE_KEY);
        if (storedOverrides) {
          const overrides = JSON.parse(storedOverrides) as Partial<Auth0User>;
          // Only apply overrides if they're for the same user (prevent applying data across accounts)
          if (overrides.sub === user.sub) {
            effectiveUser = { ...effectiveUser, ...overrides };
          }
        }
      } catch (error) {
        console.error('Error loading user overrides:', error);
      }
      
      // Set the effective user data
      setUserData(effectiveUser);
      
      // Load metadata from Firebase
      loadUserMetadata(user.sub);
    } else if (!isUserLoading) {
      setIsLoading(false);
    }
  }, [user, isUserLoading]);

  const loadUserMetadata = async (userId: string) => {
    try {
      const metadata = await getUserMetadata(userId);
      setUserMetadata(() => metadata as UserMetadata);
    } catch (error) {
      console.error('Error loading user metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (user?.sub) {
      setIsLoading(true);
      try {
        // Reload metadata from Firebase
        await loadUserMetadata(user.sub);
        
        // Re-apply any local overrides
        try {
          const storedOverrides = localStorage.getItem(USER_INFO_STORAGE_KEY);
          if (storedOverrides) {
            const overrides = JSON.parse(storedOverrides) as Partial<Auth0User>;
            if (overrides.sub === user.sub) {
              setUserData(prevUser => prevUser ? { ...prevUser, ...overrides } : null);
            }
          }
        } catch (error) {
          console.error('Error applying user overrides:', error);
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Update local state and store overrides in localStorage
  const updateLocalUserData = (updates: UserContextUpdate) => {
    if (!user?.sub) return;
    
    // Update metadata in state if provided
    if (updates.metadata) {
      setUserMetadata((prev) => prev ? { ...prev, ...updates.metadata } : updates.metadata as UserMetadata);
    }
    
    // Update user data in state and localStorage if provided
    if (updates.user) {
      // Update the in-memory state
      setUserData(prev => prev ? { ...prev, ...updates.user } : null);
      
      // Store the override in localStorage for persistence
      try {
        // First get any existing overrides
        const existingOverridesStr = localStorage.getItem(USER_INFO_STORAGE_KEY);
        const existingOverrides = existingOverridesStr ? JSON.parse(existingOverridesStr) as Record<string, unknown> : {};
        
        // Create new overrides by merging existing ones with updates
        const newOverrides = {
          ...existingOverrides,
          ...updates.user,
          // Always include the sub to validate the user
          sub: user.sub
        };
        
        // Store back to localStorage
        localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(newOverrides));
      } catch (error) {
        console.error('Error storing user overrides:', error);
      }
    }
  };

  return (
    <UserContext.Provider value={{ 
      userData, 
      userMetadata, 
      isLoading, 
      refreshUserData,
      updateLocalUserData
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}