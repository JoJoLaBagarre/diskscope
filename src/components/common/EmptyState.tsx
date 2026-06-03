import type { ReactNode } from "react";

/** Centered icon + title + free-form body. Used for placeholders and for
 *  genuine empty results ("no matches", "nothing scanned yet"). */
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
