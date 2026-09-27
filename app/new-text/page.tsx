import Header from "@/components/Header";
import NewTextForm from "./_components/NewTextForm";
import styles from "./page.module.scss";

export default function NewTextPage() {
  return (
    <div className={`${styles.page} min-vh-100`}>
      <Header />
      <main className="page-container pt-6 pb-8 mobile-pt-5">
        <NewTextForm />
      </main>
    </div>
  );
}
