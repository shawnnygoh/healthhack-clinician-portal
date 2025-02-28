'use client';

import { UserProvider as Auth0Provider } from '@auth0/nextjs-auth0/client';
import { UserProvider } from '@/context/UserContext';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Auth0Provider>
      <UserProvider>
        {children}
      </UserProvider>
    </Auth0Provider>
  );
}
