import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "ghost" | "primary"; icon?: boolean };
export function Button({ variant = "ghost", icon = false, className = "", ...props }: ButtonProps) {
  return <button {...props} className={`pg-button pg-button-${variant} ${icon ? "pg-icon-button" : ""} ${className}`} />;
}