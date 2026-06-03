import { useEffect, useRef, useState } from "react";

/** Whole seconds elapsed since `active` became true; resets to 0 when inactive.
 *  Avoids Date.now in render — uses a ticking interval while active. */
export function useElapsed(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  const start = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    start.current = performance.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((performance.now() - start.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [active]);

  return elapsed;
}
