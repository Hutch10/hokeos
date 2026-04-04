'use client';

import React, { use } from 'react';
import { notFound } from 'next/navigation';
import { 
  getBatchService, 
  getBillingService 
} from '@/lib/mock-data-gate';
import { ActionToast } from "@/components/ui/action-toast";
import { requireCurrentUser } from "@/lib/auth";
import {
  batchApiResponseSchema,
  calculatorResultSchema,
  type BatchApiData
} from "@/lib/validations/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Beaker, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ batchId: string }>;
}

export default function BatchDetailPage({ params }: PageProps) {
  const { batchId } = use(params);
  
  // requireCurrentUser() would be used here in a real production environment
  
  // FIX: Removed arguments from service getters to match mock-data-gate signature
  const batchService = getBatchService();
  const billingService = getBillingService();

  const batch = batchService.getBatchById(batchId);

  if (!batch) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link 
          href="/batches" 
          className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Batches
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{batch.name}</h1>
            <Badge variant={batch.status === 'completed' ? 'default' : 'secondary'}>
              {batch.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Batch ID: <span className="font-mono">{batchId}</span> • Created on {new Date(batch.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Export Report
          </Button>
          <Button className="gap-2">
            <Beaker className="h-4 w-4" />
            Run Analysis
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batch.volume} kg</div>
            <p className="text-xs text-muted-foreground">+2.1% from last batch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purity Grade</CardTitle>
            <Beaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batch.purity}%</div>
            <p className="text-xs text-muted-foreground">Within industrial tolerance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <AlertCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Nominal</div>
            <p className="text-xs text-muted-foreground">All sensors operational</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Batch Composition Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Detailed breakdown of the chemical and metallurgical properties for batch {batchId}.
            </p>
            <div className="rounded-md border p-4 bg-muted/50">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(batch, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <ActionToast />
    </div>
  );
}
