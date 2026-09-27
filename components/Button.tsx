import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
};

export default function Button({ children }: ButtonProps) {
  return (
    <div className="d-flex flex-1 flex-column align-items-center justify-content-center font-sans">
      {children}
    </div>
  );
}
