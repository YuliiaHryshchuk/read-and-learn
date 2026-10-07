import type { ReactNode } from "react";
import styles from "./textContainer.module.scss";

export type TextContainerProps = {
  variant?: "card" | "plain";
  className?: string;
  contentClassName?: string;
  mobileHeaderLayout?: "default" | "flow";
  hideIconOnMobile?: boolean;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode[];
  mobileActions?: ReactNode[];
  children?: ReactNode;
  showContent?: boolean;
};

export default function TextContainer({
  variant = "card",
  className,
  contentClassName,
  mobileHeaderLayout = "default",
  hideIconOnMobile = false,
  icon,
  title,
  description,
  actions = [],
  mobileActions = [],
  children,
  showContent = true,
}: TextContainerProps) {
  return (
    <section
      className={[
        styles.container,
        "width-100",
        variant === "plain" ? `${styles.plain} p-0` : "p-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header
        className={[
          styles.header,
          mobileHeaderLayout === "flow" ? styles.mobileFlowHeader : undefined,
          mobileActions.length > 0 ? styles.hasMobileActions : undefined,
          hideIconOnMobile ? styles.hideIconOnMobile : undefined,
          "d-flex align-items-center gap-4 mb-2 min-height-7 mobile-flex-wrap mobile-gap-2",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {icon && (
          <div className={`${styles.icon} d-grid place-items-center flex-none size-7 mobile-size-6`}>
            {icon}
          </div>
        )}

        <div className={`${styles.meta} min-width-0 flex-1`}>
          <h2 className={`${styles.title} m-0 text-xl font-bold line-heading mobile-text-lg`}>
            {title}
          </h2>
          {description && (
            <p className={`${styles.description} m-0 text-md line-compact text-muted`}>
              {description}
            </p>
          )}
        </div>

        {actions.length > 0 && (
          <div className={`${styles.actions} d-flex align-items-center flex-wrap justify-content-end gap-0 ml-auto`}>
            {actions.map((action, index) => (
              <div className={`${styles.action} d-flex align-items-center`} key={index}>
                {action}
              </div>
            ))}
          </div>
        )}

        {mobileActions.length > 0 && (
          <div className={`${styles.mobileActions} align-items-center flex-wrap justify-content-end gap-0 ml-auto`}>
            {mobileActions.map((action, index) => (
              <div className={`${styles.action} d-flex align-items-center`} key={index}>
                {action}
              </div>
            ))}
          </div>
        )}
      </header>

      {showContent && (
        <div
          className={[
            styles.content,
            variant === "plain"
              ? "p-0 min-height-0"
              : contentClassName
                ? undefined
                : "p-3",
            contentClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>
      )}
    </section>
  );
}
