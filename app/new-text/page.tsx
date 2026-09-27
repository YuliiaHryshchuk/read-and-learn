import Header from "@/components/Header";
import NewTextForm from "./_components/NewTextForm";
import styles from "./page.module.scss";

export default function NewTextPage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <NewTextForm />
      </main>
    </div>
  );
}
