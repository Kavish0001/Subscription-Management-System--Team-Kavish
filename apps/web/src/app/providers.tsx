import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { RouterProvider } from 'react-router-dom';

const queryClient = new QueryClient();

export function AppProviders({ router }: { router: ComponentProps<typeof RouterProvider>['router'] }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
