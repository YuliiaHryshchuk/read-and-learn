import type { ReactNode } from "react";
import styles from "./customLink.module.scss";

type CustomLinkProps = {
  children: ReactNode;
};

export default function CustomLink({ children }: CustomLinkProps) {
  return <div className={styles.button}></div>;
}
