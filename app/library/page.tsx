import Header from "@/components/Header";
import LibraryList from "./_components/LibraryList";
import styles from "./page.module.scss";

export default function LibraryPage() {
  return (
    <div className={`${styles.page} min-vh-100`}>
      <Header />
      <main className="page-container pt-6 pb-8 mobile-pt-5">
        <h1 className={`${styles.title} font-serif line-tight`}>My library</h1>
        <LibraryList />
      </main>
    </div>
  );
}
