"use client";

import { useEffect, useState } from "react";
import styles from "./puterAuth.module.scss";

type PuterUser = {
  uuid: string;
  username: string;
};

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Could not connect to Puter. Please try again.";
  }

  const puterError = error as { error?: unknown; message?: unknown; msg?: unknown };
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

export default function PuterAuth() {
  const [user, setUser] = useState<PuterUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function restoreSession() {
      try {
        const { puter } = await import("@heyputer/puter.js");
        if (!puter.auth.isSignedIn()) return;

        const currentUser = await puter.auth.getUser();
        if (isCurrent) {
          setUser({ uuid: currentUser.uuid, username: currentUser.username });
        }
      } catch {
        // A stale Puter session should not prevent the page from loading.
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void restoreSession();
    return () => {
      isCurrent = false;
    };
  }, []);

  async function signIn() {
    if (isLoading) return;

    setIsLoading(true);
    setError("");
    try {
      const { puter } = await import("@heyputer/puter.js");
      await puter.auth.signIn();
      const currentUser = await puter.auth.getUser();
      setUser({ uuid: currentUser.uuid, username: currentUser.username });
    } catch (signInError) {
      setError(getErrorMessage(signInError));
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    const { puter } = await import("@heyputer/puter.js");
    puter.auth.signOut();
    setUser(null);
    setError("");
  }

  return (
    <section
      className={`${styles.auth} d-flex flex-wrap align-items-center justify-content-between gap-6 mt-6 mb-8 p-5 mobile-flex-column mobile-align-items-stretch mobile-gap-4`}
      aria-labelledby="puter-auth-title"
    >
      <div>
        <h2 className="font-serif line-heading" id="puter-auth-title">
          {user ? `Welcome, ${user.username}` : "Ready to add your own text?"}
        </h2>
        <p className="mt-2 text-body line-body">
          {user
            ? "You are signed in with Puter."
            : "Log in with Puter to process and save your own reading materials."}
        </p>
      </div>

      {user ? (
        <button
          className={`${styles.secondaryButton} flex-none min-height-8 py-3 px-5 text-body font-bold cursor-pointer mobile-width-100`}
          type="button"
          onClick={signOut}
        >
          Log out
        </button>
      ) : (
        <button
          className={`${styles.primaryButton} flex-none min-height-8 py-3 px-5 text-body font-bold cursor-pointer mobile-width-100`}
          type="button"
          onClick={signIn}
          disabled={isLoading}
        >
          {isLoading ? "Checking sign-in…" : "Log in with Puter"}
        </button>
      )}

      {error && (
        <p className="width-100 m-0 text-danger font-semibold" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
