"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { usePuterAuth } from "@/components/PuterAuthProvider";
import { saveMaterial } from "@/lib/api/materialsClient";
import { SOURCE_LANGUAGE } from "@/lib/languages";
import { useTextStore } from "@/stores/useTextStore";

export default function SaveToLibrary() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resetDraftOnUnmountRef = useRef(false);
  const router = useRouter();
  const { requireAuthToken } = usePuterAuth();
  const startNewText = useTextStore((state) => state.startNewText);
  const editingMaterial = useTextStore((state) => state.editingMaterial);
  const result = useTextStore((state) => state.result);
  const targetLanguage = useTextStore((state) => state.targetLanguage);
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isOpeningLibrary, setIsOpeningLibrary] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    if (resetDraftOnUnmountRef.current) startNewText();
  }, [startNewText]);

  function openDialog() {
    setTitle(editingMaterial?.title ?? "");
    setMessage("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (isSaving) return;
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
    let saved = false;

    try {
      const authToken = await requireAuthToken();

      await saveMaterial(
        authToken,
        {
          title: title.trim(),
          sourceText: result.sourceText,
          sourceLanguage: SOURCE_LANGUAGE,
          targetLanguage: targetLanguage.trim(),
          adaptation: result,
        },
        editingMaterial?.id,
      );

      saved = true;
      resetDraftOnUnmountRef.current = true;
      setIsOpeningLibrary(true);
      router.push("/library");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The material could not be saved.",
      );
    } finally {
      if (!saved) setIsSaving(false);
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
        onCancel={(event) => {
          if (isSaving) event.preventDefault();
        }}
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
              disabled={isSaving}
              onClick={closeDialog}
            >
              ×
            </button>
          </header>

          <form
            className="d-flex align-items-stretch gap-3 mobile-flex-column"
            autoComplete="off"
            onSubmit={submit}
          >
            <label className="visually-hidden" htmlFor="material-title">
              Text title
            </label>
            <input
              id="material-title"
              className="form-control flex-1 min-width-0"
              name="materialTitle"
              type="text"
              autoComplete="off"
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
              {isOpeningLibrary ? "Opening library…" : isSaving ? "Saving…" : "Save"}
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
