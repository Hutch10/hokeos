'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Database as DbIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('HokeOS Deployment Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
      </div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
        System Protocol Breach
      </h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        An unexpected error occurred during the recovery sequence. 
        The incident has been logged for industrial audit.
      </p>
      <div className="flex gap-4">
        <Button
          variant="default"
          onClick={() => reset()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry Sequence
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.href = '/dashboard'}
          className="gap-2"
        >
          <DbIcon className="h-4 w-4" />
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
