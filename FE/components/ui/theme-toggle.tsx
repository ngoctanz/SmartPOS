'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-full w-10 h-10 text-gray-700">
        <Sun className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex items-center justify-center bg-muted/50 dark:bg-muted border border-border rounded-full w-10 h-10 text-foreground hover:bg-accent transition-all duration-300 shadow-sm"
      title={theme === 'dark' ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 animate-in spin-in-180 duration-500" />
      ) : (
        <Moon className="w-5 h-5 animate-in spin-in-180 duration-500" />
      )}
    </button>
  );
}
