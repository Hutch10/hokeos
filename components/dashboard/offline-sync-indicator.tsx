"use client";

import { useEffect, useState, useCallback } from "react";
import { sovereignDB } from "@/lib/offline/storage";
import { Wifi, WifiOff, RefreshCcw, CheckCircle2 } from "lucide-react";

/**
 * Phase 2: Sovereign Offline Resilience
 * Component to handle background synchronization of local yard records.
 */
export function OfflineSyncIndicator() {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncSuccess, setLastSyncSuccess] = useState(false);

  const checkPending = useCallback(async () => {
    const pending = await sovereignDB.getAllPending();
    setPendingCount(pending.length);
    return pending;
  }, []);

  const syncBatches = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    const pending = await checkPending();
    if (pending.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;

    for (const batch of pending) {
      try {
        const response = await fetch("/api/batches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch.payload),
        });

        if (response.ok) {
          await sovereignDB.clearPending(batch.id);
          successCount++;
        }
      } catch (err) {
        console.error("Sync failed for batch:", batch.id, err);
      }
    }

    setIsSyncing(false);
    await checkPending();
    
    if (successCount > 0) {
      setLastSyncSuccess(true);
      setTimeout(() => setLastSyncSuccess(false), 5000);
    }
  }, [isOnline, isSyncing, checkPending]);

  useEffect(() => {
    checkPending();

    const handleOnline = () => {
      setIsOnline(true);
      syncBatches();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncBatches, checkPending]);

  if (isOnline && pendingCount === 0 && !lastSyncSuccess) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-zinc-200 bg-white p-2 pl-4 pr-3 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Connectivity
        </span>
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-rose-500" />
          )}
          <span className={`text-xs font-bold ${isOnline ? "text-emerald-700" : "text-rose-700"}`}>
            {isOnline ? "Online" : "Sovereign Offline"}
          </span>
        </div>
      </div>

      {(pendingCount > 0 || isSyncing || lastSyncSuccess) && (
        <>
          <div className="h-8 w-px bg-zinc-100" />
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <RefreshCcw className="h-4 w-4 animate-spin text-zinc-400" />
            ) : lastSyncSuccess ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                {pendingCount}
              </div>
            )}
            <span className="text-xs font-medium text-zinc-600">
              {isSyncing ? "Syncing Batch Queue..." : lastSyncSuccess ? "All Synced" : "Pending Sync"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
