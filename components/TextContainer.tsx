import type { ReactNode } from "react";
import styles from "./textContainer.module.scss";

export type TextContainerProps = {
  variant?: "card" | "plain";
  className?: string;
  contentClassName?: string;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode[];
  children?: ReactNode;
  showContent?: boolean;
};

export default function TextContainer({
  variant = "card",
  className,
  contentClassName,
  icon,
  title,
  description,
  actions = [],
  children,
  showContent = true,
}: TextContainerProps) {
  return (
    <section className={[styles.container, variant === "plain" && styles.plain, className].filter(Boolean).join(" ")}>
      <header className={styles.header}>
        {icon && <div className={styles.icon}>{icon}</div>}

        <div className={styles.heading}>
          <h2 className={styles.title}>{title}</h2>
          {description && <p className={styles.description}>{description}</p>}
        </div>

        {actions.length > 0 && (
          <div className={styles.actions}>
            {actions.map((action, index) => (
              <div className={styles.action} key={index}>
                {action}
              </div>
            ))}
          </div>
        )}
      </header>

      {showContent && (
        <div className={[styles.content, contentClassName].filter(Boolean).join(" ")}>
          {children}
        </div>
      )}
    </section>
  );
}
