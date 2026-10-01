"use client";

import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { SOURCE_LANGUAGE } from "@/lib/languages";
import { useTextStore } from "@/stores/useTextStore";

export default function SaveToLibrary() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const clearDraft = useTextStore((state) => state.setText);
  const clearResult = useTextStore((state) => state.clearResult);
  const editingMaterial = useTextStore((state) => state.editingMaterial);
  const clearEditingMaterial = useTextStore((state) => state.clearEditingMaterial);
  const result = useTextStore((state) => state.result);
  const targetLanguage = useTextStore((state) => state.targetLanguage);
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  function openDialog() {
    setTitle(editingMaterial?.title ?? "");
    setMessage("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDialog();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || isSaving || result?.kind !== "structured") return;

    setIsSaving(true);
    setMessage("");

    try {
      const { puter } = await import("@heyputer/puter.js");
      if (!puter.auth.isSignedIn()) {
        await puter.auth.signIn();
      }
      if (!puter.authToken) {
        throw new Error("Sign in with Puter before saving a material.");
      }

      const response = await fetch(
        editingMaterial
          ? `/api/materials/${encodeURIComponent(editingMaterial.id)}`
          : "/api/materials",
        {
          method: editingMaterial ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${puter.authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            sourceText: result.sourceText,
            sourceLanguage: SOURCE_LANGUAGE,
            targetLanguage: targetLanguage.trim(),
            adaptation: result,
          }),
        },
      );

      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage = payload && typeof payload === "object"
          ? (payload as { error?: { message?: unknown } }).error?.message
          : undefined;
        throw new Error(
          typeof errorMessage === "string"
            ? errorMessage
            : "The material could not be saved.",
        );
      }

      closeDialog();
      clearDraft("");
      clearResult();
      clearEditingMaterial();
      router.push("/library");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The material could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="d-flex justify-content-end mt-5">
        <button
          type="button"
          className="button button-primary px-5 py-3 mobile-width-100"
          onClick={openDialog}
        >
          {editingMaterial ? "Save changes" : "Save to my library"}
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="modal-dialog"
        aria-labelledby="save-to-library-title"
        onClick={closeOnBackdrop}
      >
        <section className="modal-card p-5 mobile-p-4">
          <header className="d-flex align-items-center justify-content-between gap-4 mb-4">
            <h2
              id="save-to-library-title"
              className="text-xl font-bold line-heading"
            >
              {editingMaterial ? "Save changes" : "Save to my library"}
            </h2>
            <button
              type="button"
              className="button-icon flex-none"
              aria-label="Close save dialog"
              onClick={closeDialog}
            >
              ×
            </button>
          </header>

          <form
            className="d-flex align-items-stretch gap-3 mobile-flex-column"
            onSubmit={submit}
          >
            <label className="visually-hidden" htmlFor="material-title">
              Text title
            </label>
            <input
              id="material-title"
              className="form-control flex-1 min-width-0"
              name="title"
              type="text"
              placeholder="My text"
              value={title}
              maxLength={120}
              required
              autoFocus
              disabled={isSaving}
              onChange={(event) => setTitle(event.target.value)}
            />
            <button
              type="submit"
              className="button button-primary px-5 py-3 mobile-width-100"
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </form>
          {message && (
            <p className="mt-3 text-danger text-sm" role="alert">
              {message}
            </p>
          )}
        </section>
      </dialog>
    </>
  );
}
