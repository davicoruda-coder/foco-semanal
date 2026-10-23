"use client";

/**
 * Coordenação e sincronização em tempo real entre múltiplas abas (ex: ao duplicar a página no navegador).
 * - Usa BroadcastChannel para comunicação instantânea sem delay.
 * - Gerencia eleição de aba coordenadora (Leader Tab) para que APENAS UMA aba compute o tempo de foco,
 *   dispare os alarmes sonoros e registre as sessões de estudo no banco.
 * - Fornece tokens atômicos de conclusão (deduplication lock) para evitar qualquer disparo duplo.
 */

declare global {
  interface Window {
    __FOCO_TAB_ID__?: string;
  }
}

export type TabSyncMessage =
  | {
      type: "TIMER_STATE_SYNC";
      senderId: string;
      runtime?: Record<string, any>;
      stopwatch?: any;
      subjectStopwatches?: Record<string, any>;
      mode?: any;
      timestamp: number;
    }
  | {
      type: "TIMER_COMPLETED";
      senderId: string;
      timerKey: string;
      token: string | number;
      timestamp: number;
    }
  | {
      type: "SUBJECT_COMPLETE";
      senderId: string;
      subjectId: string;
      timestamp: number;
    }
  | {
      type: "CYCLE_COMPLETE";
      senderId: string;
      round: number;
      timestamp: number;
    }
  | {
      type: "STUDY_FLOW_PHASE_SYNC";
      senderId: string;
      phase: string;
      currentIndex: number;
      blockIds: string[];
      restEndsAt: number | null;
      timestamp: number;
    }
  | {
      type: "FOCUS_CREDIT_SYNC";
      senderId: string;
      countdowns: Record<string, number>;
      stopwatches: Record<string, number>;
      timestamp: number;
    }
  | {
      type: "LEADER_CLAIM";
      senderId: string;
      tabId: string;
      timestamp: number;
    }
  | {
      type: "LEADER_HEARTBEAT";
      senderId: string;
      tabId: string;
      timestamp: number;
    }
  | {
      type: "LEADER_RELEASE";
      senderId: string;
      tabId: string;
      timestamp: number;
    };

const CHANNEL_NAME = "foco_semanal_tab_channel_v1";
const LEADER_STORAGE_KEY = "foco_timer_leader_v1";
const LEADER_LEASE_MS = 3500;

export function getTabId(): string {
  if (typeof window === "undefined") return "server";
  if (!window.__FOCO_TAB_ID__) {
    window.__FOCO_TAB_ID__ =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
  return window.__FOCO_TAB_ID__;
}

let channelInstance: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!channelInstance) {
    try {
      channelInstance = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      channelInstance = null;
    }
  }
  return channelInstance;
}

export function broadcastTabMessage(msg: TabSyncMessage) {
  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage(msg);
    } catch {
      /* ignore */
    }
  }
}

export function subscribeTabMessages(
  callback: (msg: TabSyncMessage) => void,
): () => void {
  const ch = getChannel();
  if (!ch) return () => {};

  const handler = (ev: MessageEvent<TabSyncMessage>) => {
    if (ev?.data && typeof ev.data === "object") {
      callback(ev.data);
    }
  };

  ch.addEventListener("message", handler);
  return () => {
    ch.removeEventListener("message", handler);
  };
}

type LeaderRecord = {
  tabId: string;
  expiresAt: number;
};

export function readLeaderRecord(): LeaderRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEADER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeaderRecord;
    if (parsed && typeof parsed.tabId === "string" && typeof parsed.expiresAt === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function isCurrentTabLeader(): boolean {
  if (typeof window === "undefined") return false;
  const currentTabId = getTabId();
  const leader = readLeaderRecord();
  if (!leader) return false;
  return leader.tabId === currentTabId && leader.expiresAt > Date.now();
}

export function claimLeadership(): boolean {
  if (typeof window === "undefined") return false;
  const currentTabId = getTabId();
  const record: LeaderRecord = {
    tabId: currentTabId,
    expiresAt: Date.now() + LEADER_LEASE_MS,
  };
  try {
    localStorage.setItem(LEADER_STORAGE_KEY, JSON.stringify(record));
    broadcastTabMessage({
      type: "LEADER_CLAIM",
      senderId: currentTabId,
      tabId: currentTabId,
      timestamp: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

export function renewLeadership(): boolean {
  if (typeof window === "undefined") return false;
  const currentTabId = getTabId();
  const leader = readLeaderRecord();
  if (leader && leader.tabId !== currentTabId && leader.expiresAt > Date.now()) {
    // Outra aba válida é líder no momento
    return false;
  }
  const record: LeaderRecord = {
    tabId: currentTabId,
    expiresAt: Date.now() + LEADER_LEASE_MS,
  };
  try {
    localStorage.setItem(LEADER_STORAGE_KEY, JSON.stringify(record));
    broadcastTabMessage({
      type: "LEADER_HEARTBEAT",
      senderId: currentTabId,
      tabId: currentTabId,
      timestamp: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

export function releaseLeadership() {
  if (typeof window === "undefined") return;
  const currentTabId = getTabId();
  const leader = readLeaderRecord();
  if (leader && leader.tabId === currentTabId) {
    try {
      localStorage.removeItem(LEADER_STORAGE_KEY);
      broadcastTabMessage({
        type: "LEADER_RELEASE",
        senderId: currentTabId,
        tabId: currentTabId,
        timestamp: Date.now(),
      });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Trava atômica de conclusão de timer:
 * Garante que somente UMA aba execute a finalização (alarme sonoro, notificação e sessão criada no banco).
 */
export function claimTimerCompletion(timerKey: string, token: string | number): boolean {
  if (typeof window === "undefined") return true;
  const now = Date.now();
  const cleanToken = String(token || Math.floor(now / 1000));
  const storageKey = `foco_completion_claimed_${timerKey}_${cleanToken}`;

  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) {
      const claimedAt = Number(existing);
      if (Number.isFinite(claimedAt) && now - claimedAt < 20_000) {
        return false; // Já finalizado por outra aba!
      }
    }
    localStorage.setItem(storageKey, String(now));

    // Limpeza de chaves antigas (> 2 minutos)
    cleanupOldCompletionKeys(now);
    return true;
  } catch {
    return true;
  }
}

function cleanupOldCompletionKeys(now: number) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("foco_completion_claimed_")) {
        const val = Number(localStorage.getItem(key));
        if (Number.isFinite(val) && now - val > 120_000) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    /* ignore */
  }
}
