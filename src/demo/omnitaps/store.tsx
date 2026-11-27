import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  assignTable as assignTableApi,
  autoFillWaitlist as autoFillWaitlistApi,
  cancelReservation as cancelReservationApi,
  createReservation as createReservationApi,
  joinWaitlist as joinWaitlistApi,
  markAllCustomerNotificationsRead as markAllReadApi,
  markNotificationRead as markReadApi,
  messageConcierge as messageConciergeApi,
  modifyReservation as modifyReservationApi,
  promoteWaitlistEntry as promoteWaitlistEntryApi,
  rescheduleReservation as rescheduleReservationApi,
  sendReminder as sendReminderApi,
  setActiveCustomer as setActiveCustomerApi,
  setActiveOpsPersona as setActiveOpsPersonaApi,
  setApiDemoClock,
  setReservationStatus as setReservationStatusApi,
  setTableStatus as setTableStatusApi,
  type MutationResult,
  type PromotionMutationResult,
} from "./api";
import { OPS_PERSONAS } from "./constants";
import { createDemoState } from "./seed";
import { localDateKey } from "./time";
import type {
  CreateReservationInput,
  CreateReservationResult,
  Customer,
  DemoState,
  ModifyReservationInput,
  OpsPersona,
  Reservation,
  ReservationStatus,
  RescheduleInput,
  RestaurantTable,
} from "./types";

const STORAGE_KEY = "omnitaps.reservations.demo.v1";
const CHANNEL_NAME = "omnitaps-reservations-demo";

interface SyncMessage {
  type: "sync";
  state: DemoState;
}

function parseStoredState(raw: string | null): DemoState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DemoState;
    if (
      parsed?.schemaVersion !== 1 ||
      !Array.isArray(parsed.reservations) ||
      !Array.isArray(parsed.tables) ||
      !Array.isArray(parsed.waitlist) ||
      !Array.isArray(parsed.notifications)
    ) {
      return null;
    }
    if (parsed.seedAnchor !== localDateKey(new Date())) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readStoredState(): DemoState | null {
  try {
    return parseStoredState(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function persistState(state: DemoState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The demo keeps working in memory if storage is unavailable.
  }
}

function isNewer(incoming: DemoState, current: DemoState): boolean {
  const incomingTime = Date.parse(incoming.updatedAt);
  const currentTime = Date.parse(current.updatedAt);
  if (Number.isFinite(incomingTime) && Number.isFinite(currentTime)) {
    if (incomingTime !== currentTime) return incomingTime > currentTime;
  }
  return incoming.revision > current.revision;
}

export interface DemoActions {
  createReservation: (input: CreateReservationInput) => CreateReservationResult;
  joinWaitlist: (input: CreateReservationInput) => CreateReservationResult;
  cancelReservation: (reservationId: string, actorName?: string) => MutationResult;
  rescheduleReservation: (
    reservationId: string,
    input: RescheduleInput,
    actorName?: string,
  ) => void;
  modifyReservation: (
    reservationId: string,
    input: ModifyReservationInput,
    actorName?: string,
  ) => void;
  setReservationStatus: (
    reservationId: string,
    status: ReservationStatus,
    actorName: string,
  ) => MutationResult;
  assignTable: (reservationId: string, tableIds: string[], actorName: string) => void;
  promoteWaitlistEntry: (entryId: string, actorName: string) => PromotionMutationResult;
  autoFillWaitlist: (actorName: string) => MutationResult;
  setTableStatus: (
    tableId: string,
    status: RestaurantTable["status"],
    actorName: string,
  ) => void;
  sendReminder: (reservationId: string, actorName: string) => void;
  messageConcierge: (message: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllRead: () => void;
  setActiveCustomer: (customerId: string) => void;
  setActiveOpsPersona: (personaId: string) => void;
  resetDemo: () => void;
}

interface DemoContextValue {
  state: DemoState;
  customer: Customer;
  opsPersona: OpsPersona;
  actions: DemoActions;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);
  const stateRef = useRef<DemoState | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const hydratedRef = useRef(false);

  const applyIncoming = useCallback((incoming: DemoState | null) => {
    if (!incoming) return;
    const current = stateRef.current;
    if (!current || isNewer(incoming, current)) {
      stateRef.current = incoming;
      setState(incoming);
    }
  }, []);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const stored = readStoredState();
    const initial = stored ?? createDemoState();
    stateRef.current = initial;
    setState(initial);
    if (!stored) persistState(initial);
  }, []);

  const commit = useCallback((next: DemoState) => {
    stateRef.current = next;
    setState(next);
    persistState(next);
    try {
      channelRef.current?.postMessage({ type: "sync", state: next } satisfies SyncMessage);
    } catch {
      // Ignore a closed channel; local storage still carries the update.
    }
  }, []);

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        if (event.data?.type === "sync" && event.data.state) {
          applyIncoming(event.data.state);
        }
      };
      channelRef.current = channel;
    } catch {
      channelRef.current = null;
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      applyIncoming(parseStoredState(event.newValue));
    };
    const onFocus = () => applyIncoming(readStoredState());
    const onVisibility = () => {
      if (document.visibilityState === "visible") applyIncoming(readStoredState());
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      channel?.close();
      channelRef.current = null;
    };
  }, [applyIncoming]);

  const requireState = useCallback((): DemoState => {
    const current = stateRef.current;
    if (!current) throw new Error("The demo store is still loading.");
    setApiDemoClock(current.demoNow);
    return current;
  }, []);

  const createReservation = useCallback(
    (input: CreateReservationInput) => {
      const result = createReservationApi(requireState(), input);
      commit(result.state);
      return result;
    },
    [commit, requireState],
  );

  const joinWaitlist = useCallback(
    (input: CreateReservationInput) => {
      const result = joinWaitlistApi(requireState(), input);
      commit(result.state);
      return result;
    },
    [commit, requireState],
  );

  const cancelReservation = useCallback(
    (reservationId: string, actorName?: string) => {
      const result = cancelReservationApi(requireState(), reservationId, actorName);
      commit(result.state);
      return result;
    },
    [commit, requireState],
  );

  const rescheduleReservation = useCallback(
    (reservationId: string, input: RescheduleInput, actorName?: string) => {
      const next = rescheduleReservationApi(requireState(), reservationId, input, actorName);
      commit(next);
    },
    [commit, requireState],
  );

  const modifyReservation = useCallback(
    (reservationId: string, input: ModifyReservationInput, actorName?: string) => {
      const next = modifyReservationApi(requireState(), reservationId, input, actorName);
      commit(next);
    },
    [commit, requireState],
  );

  const setReservationStatus = useCallback(
    (reservationId: string, status: ReservationStatus, actorName: string) => {
      const result = setReservationStatusApi(requireState(), reservationId, status, actorName);
      commit(result.state);
      return result;
    },
    [commit, requireState],
  );

  const assignTable = useCallback(
    (reservationId: string, tableIds: string[], actorName: string) => {
      const next = assignTableApi(requireState(), reservationId, tableIds, actorName);
      commit(next);
    },
    [commit, requireState],
  );

  const promoteWaitlistEntry = useCallback(
    (entryId: string, actorName: string) => {
      const result = promoteWaitlistEntryApi(requireState(), entryId, actorName);
      commit(result.state);
      return result;
    },
    [commit, requireState],
  );

  const autoFillWaitlist = useCallback(
    (actorName: string) => {
      const result = autoFillWaitlistApi(requireState(), actorName);
      commit(result.state);
      return result;
    },
    [commit, requireState],
  );

  const setTableStatus = useCallback(
    (tableId: string, status: RestaurantTable["status"], actorName: string) => {
      const next = setTableStatusApi(requireState(), tableId, status, actorName);
      commit(next);
    },
    [commit, requireState],
  );

  const sendReminder = useCallback(
    (reservationId: string, actorName: string) => {
      const next = sendReminderApi(requireState(), reservationId, actorName);
      commit(next);
    },
    [commit, requireState],
  );

  const messageConcierge = useCallback(
    (message: string) => {
      const current = requireState();
      const next = messageConciergeApi(current, current.activeCustomerId, message);
      commit(next);
    },
    [commit, requireState],
  );

  const markNotificationRead = useCallback(
    (notificationId: string) => {
      commit(markReadApi(requireState(), notificationId));
    },
    [commit, requireState],
  );

  const markAllRead = useCallback(() => {
    const current = requireState();
    commit(markAllReadApi(current, current.activeCustomerId));
  }, [commit, requireState]);

  const setActiveCustomer = useCallback(
    (customerId: string) => {
      commit(setActiveCustomerApi(requireState(), customerId));
    },
    [commit, requireState],
  );

  const setActiveOpsPersona = useCallback(
    (personaId: string) => {
      commit(setActiveOpsPersonaApi(requireState(), personaId));
    },
    [commit, requireState],
  );

  const resetDemo = useCallback(() => {
    commit(createDemoState());
  }, [commit]);

  const actions = useMemo<DemoActions>(
    () => ({
      createReservation,
      joinWaitlist,
      cancelReservation,
      rescheduleReservation,
      modifyReservation,
      setReservationStatus,
      assignTable,
      promoteWaitlistEntry,
      autoFillWaitlist,
      setTableStatus,
      sendReminder,
      messageConcierge,
      markNotificationRead,
      markAllRead,
      setActiveCustomer,
      setActiveOpsPersona,
      resetDemo,
    }),
    [
      assignTable,
      autoFillWaitlist,
      cancelReservation,
      createReservation,
      joinWaitlist,
      markAllRead,
      markNotificationRead,
      messageConcierge,
      modifyReservation,
      promoteWaitlistEntry,
      resetDemo,
      rescheduleReservation,
      sendReminder,
      setActiveCustomer,
      setActiveOpsPersona,
      setReservationStatus,
      setTableStatus,
    ],
  );

  const value = useMemo<DemoContextValue | null>(() => {
    if (!state) return null;
    const customer =
      state.customers.find((entry) => entry.id === state.activeCustomerId) ??
      state.customers[0];
    if (!customer) return null;
    const opsPersona =
      OPS_PERSONAS.find((entry) => entry.id === state.activeOpsPersonaId) ??
      OPS_PERSONAS[0];
    if (!opsPersona) return null;
    return { state, customer, opsPersona, actions };
  }, [actions, state]);

  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-porcelain" role="status">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink-muted">
          Preparing the reservations demo…
        </p>
      </div>
    );
  }

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider.");
  return context;
}

export function customerReservations(state: DemoState, customerId: string): Reservation[] {
  return state.reservations
    .filter((reservation) => reservation.customerId === customerId)
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
}

export function customerNotifications(state: DemoState, customerId: string) {
  return state.notifications
    .filter((notification) => notification.audience === "customer" && notification.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function enterpriseNotifications(state: DemoState) {
  return state.notifications
    .filter((notification) => notification.audience === "enterprise")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export { STORAGE_KEY };
