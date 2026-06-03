import type { ReactNode } from "react";

/** A subtle explanatory note (asterisk-style) shown under a view's content. */
export function Footnote({ children }: { children: ReactNode }) {
  return <p className="footnote">{children}</p>;
}
