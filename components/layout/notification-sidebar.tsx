"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface NotificationMetadata {
  investigationId?: string;
  severity?: string;
  batchCount?: number;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  metadataJson: NotificationMetadata | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * Phase 33: Notification Sidebar
 * Persistent ledger of system alerts with read/unread tracking.
 */
export function NotificationSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/list");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.readAt).length);
      }
    } catch (err) {
      console.error("[Phase 33] Failed to fetch notification history:", err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialFetch = async () => {
      try {
        const res = await fetch("/api/notifications/list");
        if (res.ok && active) {
          const data = await res.json();
          setNotifications(data);
          setUnreadCount(data.filter((n: Notification) => !n.readAt).length);
        }
      } catch (err) {
        console.error("[Phase 33] Failed initial notification fetch:", err);
      }
    };
    initialFetch();
    return () => { active = false; };
  }, []);

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/mark-read?id=${id}`, { method: "POST" });
      setNotifications(notifications.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("[Phase 33] Failed to mark notification as read:", err);
    }
  };

  const clearAll = async () => {
    try {
      await fetch("/api/notifications/clear", { method: "POST" });
      setNotifications(notifications.map(n => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error("[Phase 33] Failed to clear notifications:", err);
    }
  };

  return (
    <>
      {/* Trigger Button (Bell) */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
        aria-label="Open Notifications"
        title="Notifications"
      >
        <span className="sr-only">Notifications</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-zinc-950 anonymize">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <aside className="relative w-full max-w-sm bg-zinc-900 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 p-4">
                <h2 className="text-lg font-semibold text-zinc-100">Audit Ledger</h2>
                <div className="flex items-center gap-3">
                  <button onClick={clearAll} className="text-xs text-zinc-400 hover:text-zinc-200">Clear All</button>
                  <button 
                    onClick={() => setIsOpen(false)} 
                    className="rounded p-1 hover:bg-zinc-800 text-zinc-400"
                    aria-label="Close Notifications"
                    title="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-center">
                    <p className="text-sm text-zinc-500 italic">No historical alerts to show.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`group relative rounded-lg border p-3 transition-all ${n.readAt ? 'border-zinc-800 bg-transparent opacity-70' : 'border-emerald-900/40 bg-emerald-950/10'}`}
                      onMouseEnter={() => !n.readAt && markRead(n.id)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm text-zinc-100 line-clamp-2">{n.message}</p>
                        {!n.readAt && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />}
                      </div>
                      
                      {n.metadataJson?.investigationId && (
                        <Link 
                          href={`/investigations/${n.metadataJson.investigationId}`}
                          className="mt-2 block text-xs font-medium text-emerald-400 hover:underline"
                          onClick={() => setIsOpen(false)}
                        >
                          View Case Detail →
                        </Link>
                      )}
                      
                      <p className="mt-1 text-[10px] text-zinc-500">
                        {new Date(n.createdAt).toLocaleString(undefined, {
                          hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric'
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
