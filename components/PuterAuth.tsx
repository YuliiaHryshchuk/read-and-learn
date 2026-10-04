"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import LoadingState from "@/components/LoadingState";
import { usePuterAuth } from "@/components/PuterAuthProvider";
import styles from "./puterAuth.module.scss";

type PuterAuthProps = {
  children?: ReactNode;
  redirectAfterSignIn?: string;
};

export default function PuterAuth({
  children,
  redirectAfterSignIn,
}: PuterAuthProps) {
  const { status, user, error, signIn } = usePuterAuth();
  const router = useRouter();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const infoId = useId();
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const infoPanelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isInfoOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        infoButtonRef.current?.contains(target) ||
        infoPanelRef.current?.contains(target)
      ) {
        return;
      }

      setIsInfoOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsInfoOpen(false);
      infoButtonRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isInfoOpen]);

  async function handleSignIn() {
    const didSignIn = await signIn();
    if (didSignIn && redirectAfterSignIn) {
      router.push(redirectAfterSignIn);
    }
  }

  if (status === "checking") {
    return children == null ? null : <LoadingState />;
  }
  if (status === "signedIn" && user) return children;

  return (
    <section
      className={`${styles.auth} d-flex flex-wrap align-items-center justify-content-between gap-6 mt-6 mb-8 p-5 mobile-flex-column mobile-align-items-stretch mobile-gap-4`}
      aria-labelledby="puter-auth-title"
    >
      <div className={styles.copy}>
        <h2 className="font-serif line-heading" id="puter-auth-title">
          Ready to add your own text?
        </h2>
        <p className="mt-2 text-body line-body">
          Log in with{" "}
          <a
            className={styles.puterLink}
            href="https://puter.com/"
            target="_blank"
            rel="noreferrer"
          >
            Puter
          </a>{" "}
          to process and save your own reading materials.{" "}
          <span className={styles.infoWrap}>
            <button
              ref={infoButtonRef}
              className={styles.infoButton}
              type="button"
              aria-label="What is Puter?"
              aria-expanded={isInfoOpen}
              aria-controls={infoId}
              onClick={() => setIsInfoOpen((isOpen) => !isOpen)}
            >
              i
            </button>
          </span>
          {isInfoOpen && (
            <span
              ref={infoPanelRef}
              className={styles.infoPanel}
              id={infoId}
              role="dialog"
              aria-label="About Puter"
            >
              <a
                className={styles.puterLink}
                href="https://puter.com/"
                target="_blank"
                rel="noreferrer"
              >
                Puter
              </a>{" "}
              is a cloud platform that gives every account a free monthly
              allowance for AI usage. No credit card is required to start. If
              you use up the allowance, you can buy more credits or wait for it
              to reset the following month.
            </span>
          )}
        </p>
      </div>

      <button
        className={`${styles.primaryButton} flex-none min-height-8 py-3 px-5 text-body font-bold cursor-pointer mobile-width-100`}
        type="button"
        onClick={() => void handleSignIn()}
      >
        Log in with Puter
      </button>

      {error && (
        <p className="width-100 m-0 text-danger font-semibold" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
