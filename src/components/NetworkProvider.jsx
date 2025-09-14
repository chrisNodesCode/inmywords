import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const NetworkContext = createContext({ inFlight: 0, isLoading: false });

export default function NetworkProvider({ children }) {
  const originalFetchRef = useRef(null);
  const [inFlight, setInFlight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (originalFetchRef.current) return; // already patched
    originalFetchRef.current = window.fetch;

    window.fetch = async (...args) => {
      setInFlight((n) => n + 1);
      try {
        // Call the original fetch with the correct `this` binding (window)
        const res = await originalFetchRef.current.call(window, ...args);
        return res;
      } finally {
        setInFlight((n) => Math.max(0, n - 1));
      }
    };

    return () => {
      // Restore if unmounted (rare in our app layout, but safe)
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
  }, []);

  const value = { inFlight, isLoading: inFlight > 0 };
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  return useContext(NetworkContext);
}
