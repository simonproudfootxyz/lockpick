const STORAGE_PREFIX = "lockpick:player:";

const getKey = (playerId) => `${STORAGE_PREFIX}${playerId}`;

export const storePlayerIdentity = (playerId, playerName) => {
  if (typeof window === "undefined") return;
  if (!playerId) return;

  try {
    const payload = {
      name: playerName || "",
      updatedAt: Date.now(),
    };
    window.sessionStorage.setItem(getKey(playerId), JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to persist player identity", error);
  }
};

export const getStoredPlayerName = (playerId) => {
  if (typeof window === "undefined") return "";
  if (!playerId) return "";

  try {
    const raw = window.sessionStorage.getItem(getKey(playerId));
    if (!raw) {
      return "";
    }
    const parsed = JSON.parse(raw);
    return typeof parsed?.name === "string" ? parsed.name : "";
  } catch (error) {
    console.warn("Failed to read stored player identity", error);
    return "";
  }
};

export const clearPlayerIdentity = (playerId) => {
  if (typeof window === "undefined") return;
  if (!playerId) return;

  try {
    window.sessionStorage.removeItem(getKey(playerId));
  } catch (error) {
    console.warn("Failed to clear player identity", error);
  }
};
