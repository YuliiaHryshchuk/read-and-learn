"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTextStore } from "@/stores/useTextStore";
import styles from "./unsavedGenerationGuard.module.scss";

type LeaveAction = () => void;

type UnsavedGenerationGuardValue = {
  requestLeave: (action: LeaveAction) => void;
};

const UnsavedGenerationGuardContext =
  createContext<UnsavedGenerationGuardValue | null>(null);

export function UnsavedGenerationGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasUnsavedGeneration = useTextStore(
    (state) => state.hasUnsavedGeneration,
  );
  const editingMaterial = useTextStore(
    (state) => state.editingMaterial,
  );
  const discardUnsavedGeneration = useTextStore(
    (state) => state.startNewText,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingActionRef = useRef<LeaveAction | null>(null);
  const skipNextPopStateRef = useRef(false);
  const isSavedMaterialEditor = pathname === "/edit"
    || pathname.startsWith("/edit/");
  const shouldGuard = hasUnsavedGeneration
    && Boolean(editingMaterial)
    && isSavedMaterialEditor;

  const returnToPage = useCallback(() => {
    pendingActionRef.current = null;
    dialogRef.current?.close();
  }, []);

  const requestLeave = useCallback((action: LeaveAction) => {
    if (!shouldGuard) {
      action();
      return;
    }

    pendingActionRef.current = action;
    dialogRef.current?.showModal();
  }, [shouldGuard]);

  const leaveWithoutSaving = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    discardUnsavedGeneration();
    dialogRef.current?.close();
    action?.();
  }, [discardUnsavedGeneration]);

  useEffect(() => {
    if (!shouldGuard) return;

    function confirmBrowserExit(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", confirmBrowserExit);
    return () => window.removeEventListener("beforeunload", confirmBrowserExit);
  }, [shouldGuard]);

  useEffect(() => {
    if (!shouldGuard) return;

    function guardBrowserBack() {
      if (skipNextPopStateRef.current) {
        skipNextPopStateRef.current = false;
        return;
      }

      // A popstate cannot be cancelled. Return to the guarded page first,
      // then repeat the back navigation only after explicit confirmation.
      skipNextPopStateRef.current = true;
      window.history.forward();
      requestLeave(() => {
        skipNextPopStateRef.current = true;
        window.history.back();
      });
    }

    window.addEventListener("popstate", guardBrowserBack);
    return () => window.removeEventListener("popstate", guardBrowserBack);
  }, [requestLeave, shouldGuard]);

  useEffect(() => {
    function guardInternalLink(event: globalThis.MouseEvent) {
      if (
        !shouldGuard
        || event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor
        || anchor.hasAttribute("download")
        || (anchor.target && anchor.target !== "_self")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin
        || (
          destination.pathname === window.location.pathname
          && destination.search === window.location.search
        )
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      requestLeave(() => {
        router.push(
          `${destination.pathname}${destination.search}${destination.hash}`,
        );
      });
    }

    document.addEventListener("click", guardInternalLink, true);
    return () => document.removeEventListener("click", guardInternalLink, true);
  }, [requestLeave, router, shouldGuard]);

  function returnOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) returnToPage();
  }

  return (
    <UnsavedGenerationGuardContext.Provider value={{ requestLeave }}>
      {children}
      <dialog
        ref={dialogRef}
        className="modal-dialog"
        aria-labelledby="unsaved-generation-title"
        onClick={returnOnBackdrop}
        onCancel={(event) => {
          event.preventDefault();
          returnToPage();
        }}
      >
        <section className="modal-card p-5 mobile-p-4">
          <h2
            id="unsaved-generation-title"
            className="text-xl font-bold line-heading"
          >
            Leave this page?
          </h2>
          <p className="mt-3 text-default line-body">
            Your generated explanation has not been saved to your library.
            Are you sure you want to leave?
          </p>
          <div className="d-flex justify-content-end gap-3 mt-5 mobile-flex-column">
            <button
              type="button"
              className={`${styles.returnButton} button px-5 py-3`}
              autoFocus
              onClick={returnToPage}
            >
              Return
            </button>
            <button
              type="button"
              className="button button-primary px-5 py-3"
              onClick={leaveWithoutSaving}
            >
              Leave without saving
            </button>
          </div>
        </section>
      </dialog>
    </UnsavedGenerationGuardContext.Provider>
  );
}

export function useUnsavedGenerationGuard() {
  const context = useContext(UnsavedGenerationGuardContext);
  if (!context) {
    throw new Error(
      "useUnsavedGenerationGuard must be used inside UnsavedGenerationGuard.",
    );
  }
  return context;
}
