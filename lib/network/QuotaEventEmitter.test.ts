import { describe, expect, it, vi } from "vitest";
import { QuotaEventEmitter } from "./QuotaEventEmitter.js";
import { QUOTA_EVENTS } from "./types.js";

describe("QuotaEventEmitter", () => {
  it("emits to listeners and supports unsubscribe", () => {
    const emitter = new QuotaEventEmitter();
    const listener = vi.fn();
    const off = emitter.on(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, listener);

    emitter.emit(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, { session: null } as never);
    expect(listener).toHaveBeenCalledTimes(1);

    off();
    emitter.emit(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, { session: null } as never);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("supports once listeners", () => {
    const emitter = new QuotaEventEmitter();
    const listener = vi.fn();
    emitter.once(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, listener);

    emitter.emit(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, { session: null } as never);
    emitter.emit(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, { session: null } as never);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("counts listeners per event", () => {
    const emitter = new QuotaEventEmitter();
    const a = vi.fn();
    const b = vi.fn();
    emitter.on(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, a);
    emitter.on(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, b);
    emitter.on(QUOTA_EVENTS.ON_STATUS_CHANGE, a);
    expect(emitter.listenerCount(QUOTA_EVENTS.ON_QUOTA_EXCEEDED)).toBe(2);
    expect(emitter.listenerCount(QUOTA_EVENTS.ON_STATUS_CHANGE)).toBe(1);
    expect(emitter.listenerCount()).toBe(2); // defaults to ON_QUOTA_EXCEEDED
  });

  it("does not emit to removed listeners during a snapshot", () => {
    const emitter = new QuotaEventEmitter();
    const first = vi.fn();
    const second = vi.fn();
    emitter.on(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, first);
    emitter.on(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, () => {
      emitter.off(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, second);
    });
    emitter.on(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, second);
    emitter.emit(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, { session: null } as never);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
