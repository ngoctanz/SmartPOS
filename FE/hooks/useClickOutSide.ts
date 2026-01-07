import { useEffect, useRef } from "react";

export default function useClickOutSide(handler: () => void) {
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nodeRef.current && !nodeRef.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handler]);

  return { nodeRef };
}
