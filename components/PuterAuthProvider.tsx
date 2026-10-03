"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getPuterClient } from "@/lib/puterClient";
import {
  activateTextStoreForUser,
  clearTextStoreForCurrentUser,
} from "@/stores/useTextStore";

export type PuterUser = {
  uuid: string;
  username: string;
};

export type PuterAuthStatus =
  | "checking"
  | "signedOut"
  | "signedIn"
  | "error";

type PuterAuthContextValue = {
  status: PuterAuthStatus;
  user: PuterUser | null;
  error: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  requireAuthToken: () => Promise<string>;
};

const PuterAuthContext = createContext<PuterAuthContextValue | null>(null);

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Could not connect to Puter. Please try again.";
  }

  const puterError = error as {
    error?: unknown;
    message?: unknown;
    msg?: unknown;
  };
  if (puterError.error === "popup_blocked") {
    return "Your browser blocked the Puter sign-in window. Allow pop-ups and try again.";
  }
  if (puterError.error === "auth_window_closed") {
    return "The Puter sign-in window was closed before sign-in finished.";
  }

  const message = puterError.message ?? puterError.msg;
  return typeof message === "string" && message
    ? message
    : "Could not connect to Puter. Please try again.";
}

export function PuterAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PuterAuthStatus>("checking");
  const [user, setUser] = useState<PuterUser | null>(null);
  const [error, setError] = useState("");

  const activateAuthenticatedUser = useCallback(async (currentUser: PuterUser) => {
    await activateTextStoreForUser(currentUser.uuid);
    setUser({ uuid: currentUser.uuid, username: currentUser.username });
    setError("");
    setStatus("signedIn");
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function restoreSession() {
      try {
        const puter = await getPuterClient();
        if (!puter.auth.isSignedIn()) {
          if (isCurrent) setStatus("signedOut");
          return;
        }

        const currentUser = await puter.auth.getUser();
        if (isCurrent) await activateAuthenticatedUser(currentUser);
      } catch (restoreError) {
        if (!isCurrent) return;
        setUser(null);
        setError(getErrorMessage(restoreError));
        setStatus("error");
      }
    }

    void restoreSession();
    return () => {
      isCurrent = false;
    };
  }, [activateAuthenticatedUser]);

  const signIn = useCallback(async () => {
    if (status === "checking") return;

    setStatus("checking");
    setError("");
    try {
      const puter = await getPuterClient();
      await puter.auth.signIn();
      const currentUser = await puter.auth.getUser();
      await activateAuthenticatedUser(currentUser);
    } catch (signInError) {
      setUser(null);
      setError(getErrorMessage(signInError));
      setStatus("signedOut");
    }
  }, [activateAuthenticatedUser, status]);

  const signOut = useCallback(async () => {
    setStatus("checking");
    await clearTextStoreForCurrentUser();
    try {
      const puter = await getPuterClient();
      await Promise.resolve(puter.auth.signOut());
      setError("");
    } catch (signOutError) {
      setError(getErrorMessage(signOutError));
    } finally {
      setUser(null);
      setStatus("signedOut");
    }
  }, []);

  const requireAuthToken = useCallback(async () => {
    const puter = await getPuterClient();
    if (!puter.auth.isSignedIn() || !puter.authToken) {
      setUser(null);
      setStatus("signedOut");
      throw new Error("Log in with Puter to continue.");
    }
    return puter.authToken;
  }, []);

  const value = useMemo<PuterAuthContextValue>(() => ({
    status,
    user,
    error,
    signIn,
    signOut,
    requireAuthToken,
  }), [error, requireAuthToken, signIn, signOut, status, user]);

  return (
    <PuterAuthContext.Provider value={value}>
      {children}
    </PuterAuthContext.Provider>
  );
}

export function usePuterAuth() {
  const context = useContext(PuterAuthContext);
  if (!context) {
    throw new Error("usePuterAuth must be used inside PuterAuthProvider.");
  }
  return context;
}
