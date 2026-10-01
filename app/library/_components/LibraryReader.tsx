"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import ProcessedExample from "@/components/ProcessedExample";
import TextContainer from "@/components/TextContainer";
import {
  isAdaptationResult,
  type StructuredAdaptationResult,
} from "@/lib/adaptation";
import { useTextStore } from "@/stores/useTextStore";
import styles from "../page.module.scss";

type SavedMaterial = {
  id: string;
  title: string;
  sourceText: string;
  adaptation: StructuredAdaptationResult;
};

function getResponseError(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const message = (payload as { error?: { message?: unknown } }).error?.message;
  return typeof message === "string" ? message : null;
}

function getMaterialId() {
  const segment = window.location.pathname.split("/").filter(Boolean).at(-1);
  if (!segment) return null;

  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export default function LibraryReader() {
  const router = useRouter();
  const startEditingMaterial = useTextStore((state) => state.startEditingMaterial);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [material, setMaterial] = useState<SavedMaterial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadMaterial() {
      try {
        const id = getMaterialId();
        if (!id) throw new Error("The material URL is invalid.");

        const { puter } = await import("@heyputer/puter.js");
        if (!puter.auth.isSignedIn() || !puter.authToken) {
          throw new Error("Log in with Puter to read this material.");
        }

        const response = await fetch(`/api/materials/${encodeURIComponent(id)}`, {
          headers: {
            Authorization: `Bearer ${puter.authToken}`,
          },
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            getResponseError(payload) ?? "The material could not be loaded.",
          );
        }

        const loaded = payload && typeof payload === "object"
          ? (payload as { material?: unknown }).material
          : null;
        if (!isSavedMaterial(loaded)) {
          throw new Error("The material returned an invalid response.");
        }

        if (isCurrent) setMaterial(loaded);
      } catch (error) {
        if (isCurrent) {
          setMessage(
            error instanceof Error
              ? error.message
              : "The material could not be loaded.",
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadMaterial();
    return () => {
      isCurrent = false;
    };
  }, []);

  function openDeleteDialog() {
    setMessage("");
    deleteDialogRef.current?.showModal();
  }

  function editMaterial() {
    if (!material) return;
    startEditingMaterial({
      id: material.id,
      title: material.title,
      sourceText: material.sourceText,
      adaptation: material.adaptation,
    });
    router.push(`/new-text?edit=${encodeURIComponent(material.id)}`);
  }

  function closeDeleteDialog() {
    if (!isDeleting) deleteDialogRef.current?.close();
  }

  function closeDeleteDialogOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDeleteDialog();
  }

  async function deleteMaterial() {
    if (!material || isDeleting) return;

    setIsDeleting(true);
    setMessage("");
    try {
      const { puter } = await import("@heyputer/puter.js");
      if (!puter.auth.isSignedIn() || !puter.authToken) {
        throw new Error("Log in with Puter before deleting this material.");
      }

      const response = await fetch(
        `/api/materials/${encodeURIComponent(material.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${puter.authToken}`,
          },
        },
      );
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        throw new Error(
          getResponseError(payload) ?? "The material could not be deleted.",
        );
      }

      deleteDialogRef.current?.close();
      router.push("/library");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The material could not be deleted.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) return <p>Loading…</p>;

  if (!material) {
    return (
      <section className={`${styles.readerMessage} p-5 text-center`}>
        <h1 className="text-2xl line-heading">Unable to open material</h1>
        <p className="mt-3 text-muted" role="alert">{message}</p>
        <Link className={`${styles.backLink} d-inline-block mt-5`} href="/library">
          Back to my library
        </Link>
      </section>
    );
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between gap-4 mobile-flex-column mobile-align-items-stretch">
        <div className="min-width-0">
          <Link className={`${styles.backLink} text-sm`} href="/library">
            ← My library
          </Link>
          <h1 className={`${styles.readerTitle} mt-2 font-serif line-tight`}>
            {material.title}
          </h1>
        </div>
      </div>

      <TextContainer
        className={`${styles.originalContainer} mt-5 min-width-0`}
        contentClassName={`${styles.originalText} min-height-0 p-3 text-default text-xl line-body white-space-pre-line`}
        icon={<Image src="/icons/document.svg" width={22} height={22} alt="" />}
        title="Original text"
        actions={[
          <button key="delete" type="button" onClick={openDeleteDialog}>
            Delete
          </button>,
          <button key="edit" type="button" onClick={editMaterial}>
            Edit
          </button>,
        ]}
      >
        <p lang="es">{material.sourceText}</p>
      </TextContainer>

      <ProcessedExample
        original={material.sourceText}
        initiallyOpenFirstFragment={false}
        result={material.adaptation.fragments.map((fragment) => ({
          text: fragment.text,
          translation: fragment.translation,
          explanation: fragment.explanation,
        }))}
      />

      <dialog
        ref={deleteDialogRef}
        className="modal-dialog"
        aria-labelledby="delete-material-title"
        onClick={closeDeleteDialogOnBackdrop}
        onCancel={(event) => {
          if (isDeleting) event.preventDefault();
        }}
      >
        <section className="modal-card p-5 mobile-p-4">
          <header className="d-flex align-items-center justify-content-between gap-4 mb-4">
            <h2 id="delete-material-title" className="text-xl font-bold line-heading">
              Delete this text?
            </h2>
            <button
              type="button"
              className="button-icon flex-none"
              aria-label="Close delete dialog"
              disabled={isDeleting}
              onClick={closeDeleteDialog}
            >
              ×
            </button>
          </header>

          <p className="text-default line-body">
            This will permanently delete “{material.title}” and all of its saved
            translations and explanations. There is no way to undo this action.
          </p>

          {message && (
            <p className="mt-3 text-danger text-sm" role="alert">
              {message}
            </p>
          )}

          <div className="d-flex justify-content-end gap-3 mt-5 mobile-flex-column">
            <button
              type="button"
              className={`${styles.cancelButton} button px-5 py-3`}
              disabled={isDeleting}
              onClick={closeDeleteDialog}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.deleteButton} button px-5 py-3`}
              disabled={isDeleting}
              onClick={deleteMaterial}
            >
              {isDeleting ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </section>
      </dialog>
    </>
  );
}

function isSavedMaterial(value: unknown): value is SavedMaterial {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  const adaptation = candidate.adaptation;
  return typeof candidate.id === "string"
    && typeof candidate.title === "string"
    && typeof candidate.sourceText === "string"
    && isAdaptationResult(adaptation)
    && adaptation.kind === "structured"
    && adaptation.sourceText === candidate.sourceText;
}
