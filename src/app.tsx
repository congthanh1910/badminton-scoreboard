import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom';
import Page from '@/pages';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';

const client = new QueryClient();

export default function App() {
  const isMediumDevice = useMediaQuery('only screen and (max-width : 769px)');
  if (!isMediumDevice) return 'Not supported screen size larger 769px';
  return (
    <BrowserRouter>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/" element={<Page />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h2 className="text-9xl font-bold">404</h2>
        <h3 className="text-2xl">There’s been a glitch…</h3>
      </div>
      <Button asChild>
        <Link to="/">Return</Link>
      </Button>
    </div>
  );
}
