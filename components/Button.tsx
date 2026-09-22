import styles from "./button.module.scss";
import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
};

export default function Button({ children }: ButtonProps) {
  return <div className={styles.button}></div>;
}
