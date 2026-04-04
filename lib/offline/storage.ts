/**
 * Phase 2: Sovereign Offline Resilience
 * Native IndexedDB wrapper for persistent yard operations.
 * Allows HokeOS to function without a network heartbeat.
 */

export interface PendingBatch {
  id: string; // Temporary UUID for local tracking
  payload: any;
  timestamp: string;
}

export interface CachedSpotPrices {
  id: "latest";
  prices: Record<string, number>;
  timestamp: string;
}

class SovereignDB {
  private name = "HokeOS_Sovereign_Persistence";
  private version = 1;

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        reject(new Error("IndexedDB not supported"));
        return;
      }
      const request = indexedDB.open(this.name, this.version);
      
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("pending_batches")) {
          db.createObjectStore("pending_batches", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("cached_prices")) {
          db.createObjectStore("cached_prices", { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Price Sovereignty: Cache spot prices for offline calculations.
   */
  async cachePrices(prices: Record<string, number>) {
    try {
      const db = await this.getDB();
      const tx = db.transaction("cached_prices", "readwrite");
      tx.objectStore("cached_prices").put({
        id: "latest",
        prices,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Local price caching failed:", err);
    }
  }

  async getCachedPrices(): Promise<CachedSpotPrices | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction("cached_prices", "readonly");
        const request = tx.objectStore("cached_prices").get("latest");
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Batch Queue: Store intakes while zero-G (offline).
   */
  async savePendingBatch(payload: any) {
    try {
      const db = await this.getDB();
      const tx = db.transaction("pending_batches", "readwrite");
      const id = `local_${crypto.randomUUID()}`;
      tx.objectStore("pending_batches").add({
        id,
        payload,
        timestamp: new Date().toISOString(),
      });
      return id;
    } catch (err) {
      console.error("Local batch save failed:", err);
      return null;
    }
  }

  async getAllPending(): Promise<PendingBatch[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction("pending_batches", "readonly");
        const request = tx.objectStore("pending_batches").getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async clearPending(id: string) {
    try {
      const db = await this.getDB();
      const tx = db.transaction("pending_batches", "readwrite");
      tx.objectStore("pending_batches").delete(id);
    } catch (err) {
      console.error("Failed to clear local batch:", err);
    }
  }
}

export const sovereignDB = new SovereignDB();
