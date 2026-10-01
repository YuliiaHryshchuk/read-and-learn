import Header from "@/components/Header";
import NewTextForm from "../../new-text/_components/NewTextForm";
import styles from "../../new-text/page.module.scss";

// Static export needs one concrete file. The Pages function at /edit/:id
// serves this editor shell for every saved material URL; the client then loads
// the owner-scoped material from the API.
export function generateStaticParams() {
  return [{ id: "material" }];
}

export const dynamicParams = false;

export default function EditMaterialPage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={`${styles.main} page-container pt-6 pb-8 mobile-pt-5`}>
        <NewTextForm mode="edit" />
      </main>
    </div>
  );
}
