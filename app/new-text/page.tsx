import type { Metadata } from "next";
import Header from "@/components/Header";
import PuterAuth from "@/components/PuterAuth";
import NewTextForm from "./_components/NewTextForm";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "New text",
  description:
    "Create a reading material with translations and focused language explanations.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewTextPage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={`${styles.main} page-container pt-6 pb-8 mobile-pt-5`}>
        <PuterAuth>
          <NewTextForm mode="create" />
        </PuterAuth>
      </main>
    </div>
  );
}
