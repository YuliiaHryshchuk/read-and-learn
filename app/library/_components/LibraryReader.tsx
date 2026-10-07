"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import LoadingState from "@/components/LoadingState";
import { usePuterAuth } from "@/components/PuterAuthProvider";
import ProcessedExample from "@/components/ProcessedExample";
import TextContainer from "@/components/TextContainer";
import {
  deleteMaterial as deleteSavedMaterial,
  getMaterial,
  type SavedMaterial,
} from "@/lib/api/materialsClient";
import { decodeMaterialId, encodeMaterialId } from "@/lib/materialId";
import { useTextStore } from "@/stores/useTextStore";
import styles from "../page.module.scss";

function getMaterialId() {
  const segment = window.location.pathname.split("/").filter(Boolean).at(-1);
  if (!segment) return null;

  try {
    return decodeMaterialId(decodeURIComponent(segment));
  } catch {
    return null;
  }
}

export default function LibraryReader() {
  const router = useRouter();
  const { requireAuthToken } = usePuterAuth();
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

        const authToken = await requireAuthToken();
        const loaded = await getMaterial(authToken, id);

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
  }, [requireAuthToken]);

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
      targetLanguage: material.targetLanguage,
      adaptation: material.adaptation,
    });
    router.push(`/edit/${encodeMaterialId(material.id)}`);
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
      const authToken = await requireAuthToken();
      await deleteSavedMaterial(authToken, material.id);

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

  if (isLoading) return <LoadingState />;

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
          <Link className={`${styles.backLink} ${styles.backButton} text-sm`} href="/library">
            <Image
              className={styles.backChevron}
              src="/icons/chevron-down.svg"
              width={16}
              height={16}
              alt=""
            />
            <span>My library</span>
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
        <p>{material.sourceText}</p>
      </TextContainer>

      <ProcessedExample
        initiallyOpenFirstFragment={false}
        result={material.adaptation.fragments}
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
