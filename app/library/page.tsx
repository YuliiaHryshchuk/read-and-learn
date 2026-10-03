import type { Metadata } from "next";
import Header from "@/components/Header";
import PuterAuth from "@/components/PuterAuth";
import LibraryList from "./_components/LibraryList";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "My library",
  description: "Open and manage your saved language-learning materials.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LibraryPage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className="page-container pt-6 pb-8 mobile-pt-5">
        <PuterAuth>
          <h1 className={`${styles.title} font-serif line-tight`}>My library</h1>
          <LibraryList />
        </PuterAuth>
      </main>
    </div>
  );
}
