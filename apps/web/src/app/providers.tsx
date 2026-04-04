import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { RouterProvider } from 'react-router-dom';

import { SessionProvider } from '../lib/session';

const queryClient = new QueryClient();

export function AppProviders({ router }: { readonly router: ComponentProps<typeof RouterProvider>['router'] }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>
  );
}
