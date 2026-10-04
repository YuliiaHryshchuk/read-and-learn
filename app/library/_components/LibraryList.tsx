"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import LoadingState from "@/components/LoadingState";
import { usePuterAuth } from "@/components/PuterAuthProvider";
import {
  listMaterials,
  type MaterialListItem,
} from "@/lib/api/materialsClient";
import { encodeMaterialId } from "@/lib/materialId";
import styles from "../page.module.scss";

export default function LibraryList() {
  const { requireAuthToken } = usePuterAuth();
  const [materials, setMaterials] = useState<MaterialListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadMaterials() {
      try {
        const authToken = await requireAuthToken();
        const payload = await listMaterials(authToken, 0);

        if (isCurrent) {
          setMaterials(payload.materials);
          setHasMore(payload.hasMore);
        }
      } catch (error) {
        if (isCurrent) {
          setMessage(
            error instanceof Error
              ? error.message
              : "The library could not be loaded.",
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadMaterials();
    return () => {
      isCurrent = false;
    };
  }, [requireAuthToken]);

  async function loadMore() {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setMessage("");
    try {
      const authToken = await requireAuthToken();
      const payload = await listMaterials(authToken, materials.length);
      setMaterials((current) => [...current, ...payload.materials]);
      setHasMore(payload.hasMore);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "More materials could not be loaded.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (isLoading) return <LoadingState />;

  return (
    <>
      <h1 className={`${styles.title} font-serif line-tight`}>My library</h1>

      {message && materials.length === 0 && (
        <p className="mt-5" role="alert">{message}</p>
      )}

      {!message && materials.length === 0 && (
        <p className="mt-5">Your library is empty.</p>
      )}

      {materials.length > 0 && (
        <ul className={`${styles.list} d-grid gap-3 mt-5`}>
          {materials.map((material) => (
            <li className={`${styles.card} p-3`} key={material.id}>
              <header className="d-flex align-items-center justify-content-between gap-4 mb-3 mobile-gap-2">
                <div className="d-flex align-items-center gap-3 min-width-0">
                  <span
                    className={`${styles.icon} d-grid place-items-center flex-none size-7`}
                  >
                    <Image
                      src="/icons/document.svg"
                      width={20}
                      height={20}
                      alt=""
                    />
                  </span>
                  <h2 className="min-width-0 text-xl font-bold line-heading">
                    {material.title}
                  </h2>
                </div>
                <a
                  className={`${styles.openLink} d-inline-flex align-items-center flex-none text-md`}
                  href={`/library/${encodeMaterialId(material.id)}`}
                >
                  Open for reading
                </a>
              </header>
              <p
                className={`${styles.preview} p-3 text-default text-md line-body`}
              >
                <span className={styles.previewText}>{material.preview}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {message && materials.length > 0 && (
        <p className="mt-3 text-danger text-sm text-center" role="alert">
          {message}
        </p>
      )}

      {hasMore && (
        <div className="d-flex justify-content-center mt-5">
          <button
            className={`${styles.loadMore} button px-7 py-3 text-lg`}
            type="button"
            disabled={isLoadingMore}
            onClick={loadMore}
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
