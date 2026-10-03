"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTextStore } from "@/stores/useTextStore";
import styles from "./header.module.scss";

export default function Header() {
  const pathname = usePathname();
  const startNewText = useTextStore((state) => state.startNewText);
  const isNewTextActive = pathname === "/new-text"
    || pathname.startsWith("/new-text/");
  const isLibraryActive = pathname === "/library"
    || pathname.startsWith("/library/")
    || pathname === "/edit"
    || pathname.startsWith("/edit/");

  return (
    <header className={`${styles.header} width-100`}>
      <div className={`${styles.inner} page-container d-flex align-items-center justify-content-between gap-5 mobile-flex-wrap mobile-gap-3 mobile-py-3`}>
        <Link
          className={`${styles.brand} d-inline-flex align-items-center gap-2 text-2xl font-bold white-space-nowrap mobile-text-lg`}
          href="/"
          aria-label="Read & Learn home"
        >
          <Image
            className="flex-none size-6"
            src="/icons/book.svg"
            width={29}
            height={29}
            alt=""
          />
          <span>Read &amp; Learn</span>
        </Link>
        <nav
          className="d-flex align-items-center gap-5 text-body font-semibold white-space-nowrap mobile-gap-3 mobile-text-sm"
          aria-label="Main navigation"
        >
          <Link
            className={styles.navLink}
            href="/new-text"
            aria-current={isNewTextActive ? "page" : undefined}
            onClick={() => {
              if (useTextStore.getState().editingMaterial) {
                startNewText();
              }
            }}
          >
            New text
          </Link>
          <Link
            className={styles.navLink}
            href="/library"
            aria-current={isLibraryActive ? "page" : undefined}
          >
            My library
          </Link>
        </nav>
      </div>
    </header>
  );
}
