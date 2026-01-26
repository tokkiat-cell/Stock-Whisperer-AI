const GUEST_USAGE_KEY = "stockwhisperer_guest_usage";

interface GuestUsage {
  date: string;
  analysisCount: number;
  chatCount: number;
}

const GUEST_LIMITS = {
  analysis: 3,
  chat: 2,
};

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getGuestUsage(): GuestUsage {
  try {
    const stored = localStorage.getItem(GUEST_USAGE_KEY);
    if (stored) {
      const usage = JSON.parse(stored) as GuestUsage;
      if (usage.date === getTodayKey()) {
        return usage;
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  return { date: getTodayKey(), analysisCount: 0, chatCount: 0 };
}

function saveGuestUsage(usage: GuestUsage): void {
  try {
    localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(usage));
  } catch (e) {
    // Ignore storage errors
  }
}

export function useGuestUsage() {
  const usage = getGuestUsage();

  const canUseAnalysis = usage.analysisCount < GUEST_LIMITS.analysis;
  const canUseChat = usage.chatCount < GUEST_LIMITS.chat;

  const incrementAnalysis = (): boolean => {
    const current = getGuestUsage();
    if (current.analysisCount >= GUEST_LIMITS.analysis) {
      return false;
    }
    current.analysisCount += 1;
    saveGuestUsage(current);
    return true;
  };

  const incrementChat = (): boolean => {
    const current = getGuestUsage();
    if (current.chatCount >= GUEST_LIMITS.chat) {
      return false;
    }
    current.chatCount += 1;
    saveGuestUsage(current);
    return true;
  };

  const getRemainingAnalysis = (): number => {
    return Math.max(0, GUEST_LIMITS.analysis - getGuestUsage().analysisCount);
  };

  const getRemainingChat = (): number => {
    return Math.max(0, GUEST_LIMITS.chat - getGuestUsage().chatCount);
  };

  return {
    usage: getGuestUsage(),
    limits: GUEST_LIMITS,
    canUseAnalysis,
    canUseChat,
    incrementAnalysis,
    incrementChat,
    getRemainingAnalysis,
    getRemainingChat,
  };
}
