import { useState, useEffect } from "react";

/**
 * Hook to detect if the current device is mobile
 * Uses matchMedia to check screen width and touch capability
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check both screen width and touch capability
    const checkMobile = () => {
      const isSmallScreen = window.innerWidth < breakpoint;
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(isSmallScreen || (hasTouchScreen && window.innerWidth < 1024));
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener("resize", checkMobile);
    
    // Listen for orientation change (mobile specific)
    window.addEventListener("orientationchange", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
    };
  }, [breakpoint]);

  return isMobile;
}
