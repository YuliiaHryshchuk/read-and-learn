"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { encodeMaterialId } from "@/lib/materialId";
import styles from "../page.module.scss";

type MaterialListItem = {
  id: string;
  title: string;
  preview: string;
};

type MaterialListPayload = {
  materials: MaterialListItem[];
  hasMore: boolean;
};

const PAGE_SIZE = 10;

function getResponseError(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const message = (payload as { error?: { message?: unknown } }).error?.message;
  return typeof message === "string" ? message : null;
}

export default function LibraryList() {
  const [materials, setMaterials] = useState<MaterialListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadMaterials() {
      try {
        const payload = await fetchMaterials(0);

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
  }, []);

  async function loadMore() {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setMessage("");
    try {
      const payload = await fetchMaterials(materials.length);
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

  if (isLoading) return <p>Loading…</p>;
  if (message && materials.length === 0) return <p role="alert">{message}</p>;
  if (materials.length === 0) return <p>Your library is empty.</p>;

  return (
    <>
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
              lang="es"
            >
              <span className={styles.previewText}>{material.preview}</span>
            </p>
          </li>
        ))}
      </ul>

      {message && (
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

async function fetchMaterials(offset: number): Promise<MaterialListPayload> {
  const { puter } = await import("@heyputer/puter.js");
  if (!puter.auth.isSignedIn() || !puter.authToken) {
    throw new Error("Log in with Puter to view your library.");
  }

  const response = await fetch(`/api/materials?offset=${offset}`, {
    headers: {
      Authorization: `Bearer ${puter.authToken}`,
    },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      getResponseError(payload) ?? "The library could not be loaded.",
    );
  }

  const candidate =
    payload && typeof payload === "object"
      ? (payload as { materials?: unknown; hasMore?: unknown })
      : null;
  if (
    !candidate ||
    !Array.isArray(candidate.materials) ||
    typeof candidate.hasMore !== "boolean"
  ) {
    throw new Error("The library returned an invalid response.");
  }

  const materials = candidate.materials.filter(
    (item): item is MaterialListItem =>
      Boolean(
        item &&
        typeof item === "object" &&
        typeof (item as MaterialListItem).id === "string" &&
        typeof (item as MaterialListItem).title === "string" &&
        typeof (item as MaterialListItem).preview === "string",
      ),
  );
  if (
    materials.length !== candidate.materials.length ||
    materials.length > PAGE_SIZE
  ) {
    throw new Error("The library returned an invalid response.");
  }

  return { materials, hasMore: candidate.hasMore };
}
