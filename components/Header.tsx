import Link from "next/link";
import Image from "next/image";
import styles from "./header.module.scss";

export default function Header() {
  return (
    <header className={`${styles.header} width-100`}>
      <div className={`${styles.inner} page-container d-flex align-items-center justify-content-between gap-5 mobile-flex-wrap mobile-gap-3 mobile-py-3`}>
        <Link
          className={`${styles.brand} d-inline-flex align-items-center gap-2 text-2xl font-bold white-space-nowrap mobile-text-lg`}
          href="/"
          aria-label="Read and study home"
        >
          <Image
            className="flex-none size-6"
            src="/icons/book.svg"
            width={29}
            height={29}
            alt=""
          />
          <span>Read and study</span>
        </Link>
        <nav
          className="d-flex align-items-center gap-5 text-body font-semibold white-space-nowrap mobile-gap-3 mobile-text-sm"
          aria-label="Main navigation"
        >
          <Link href="/new-text">New text</Link>
          <Link href="/library">My library</Link>
          <Link href="/profile">Profile</Link>
        </nav>
      </div>
    </header>
  );
}
