import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "garment-erp:sidebar-collapsed";
const EVENT = "garment-erp:sidebar-collapsed-change";

// localStorage may be blocked or empty (private windows, previews): every
// access is guarded and the sidebar simply defaults to expanded.
function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Desktop sidebar collapse preference, persisted locally. Server render is always expanded. */
export function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);

  const setCollapsed = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Preference just won't persist.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [collapsed, setCollapsed] as const;
}
