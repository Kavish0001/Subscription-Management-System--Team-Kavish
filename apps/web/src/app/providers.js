import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
const queryClient = new QueryClient();
export function AppProviders({ router }) {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(RouterProvider, { router: router }) }));
}
