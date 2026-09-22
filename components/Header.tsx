import Link from "next/link";
import Image from "next/image";
import styles from "./header.module.scss";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="Read and study home">
          <Image
            className={styles.logo}
            src="/icons/book.svg"
            width={29}
            height={29}
            alt=""
          />
          <span>Read and study</span>
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="/library">My library</Link>
          <Link href="/profile">Profile</Link>
        </nav>
      </div>
    </header>
  );
}
