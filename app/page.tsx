import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">HokeOS v1.6.1</h1>
      <p className="text-muted-foreground mb-8 text-lg">Industrial Recovery Ledger & Batch Tracking</p>
      <Link href="/dashboard">
        <Button size="lg">Enter Dashboard</Button>
      </Link>
    </div>
  );
}
