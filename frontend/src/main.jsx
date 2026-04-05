import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'

// ── TanStack Query client ──
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 1000,          // 5 seconds
      refetchInterval: 15 * 1000,   // auto-refetch every 15s
      refetchOnWindowFocus: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1f2e',
            color: '#e2e8f0',
            border: '1px solid #2d3748',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
