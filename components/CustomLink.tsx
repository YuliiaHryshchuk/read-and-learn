import type { ReactNode } from "react";

type CustomLinkProps = {
  children: ReactNode;
};

export default function CustomLink({ children }: CustomLinkProps) {
  return (
    <div className="d-flex flex-1 flex-column align-items-center justify-content-center font-sans">
      {children}
    </div>
  );
}
