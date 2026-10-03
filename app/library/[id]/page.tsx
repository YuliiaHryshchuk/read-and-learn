import type { Metadata } from "next";
import Header from "@/components/Header";
import PuterAuth from "@/components/PuterAuth";
import LibraryReader from "../_components/LibraryReader";
import styles from "../page.module.scss";

export const metadata: Metadata = {
  title: "Reading material",
  description: "Read a saved language-learning material.",
  robots: {
    index: false,
    follow: false,
  },
};

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
        <PuterAuth>
          <LibraryReader />
        </PuterAuth>
      </main>
    </div>
  );
}
