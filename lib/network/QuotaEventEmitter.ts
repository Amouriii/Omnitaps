import { QUOTA_EVENTS, type QuotaEventMap, type QuotaEventName } from "./types.js";

type Listener<T> = (payload: T) => void;

export class QuotaEventEmitter {
  private readonly listeners = new Map<QuotaEventName, Set<Listener<unknown>>>();

  on<K extends QuotaEventName>(event: K, listener: Listener<QuotaEventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<unknown>);
    return () => this.off(event, listener);
  }

  off<K extends QuotaEventName>(event: K, listener: Listener<QuotaEventMap[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }

  once<K extends QuotaEventName>(event: K, listener: Listener<QuotaEventMap[K]>): () => void {
    const wrapped: Listener<QuotaEventMap[K]> = (payload) => {
      this.off(event, wrapped);
      listener(payload);
    };
    return this.on(event, wrapped);
  }

  emit<K extends QuotaEventName>(event: K, payload: QuotaEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of [...set]) {
      listener(payload);
    }
  }

  listenerCount(event: QuotaEventName = QUOTA_EVENTS.ON_QUOTA_EXCEEDED): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
