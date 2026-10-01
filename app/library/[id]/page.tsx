import Header from "@/components/Header";
import LibraryReader from "../_components/LibraryReader";
import styles from "../page.module.scss";

// Static export needs one concrete file. The Pages function at /library/:id
// serves this shell for every saved material URL; the client then loads the
// owner-scoped material from the API.
export function generateStaticParams() {
  return [{ id: "material" }];
}

export const dynamicParams = false;

export default function SavedMaterialPage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className="page-container pt-6 pb-8 mobile-pt-5">
        <LibraryReader />
      </main>
    </div>
  );
}
