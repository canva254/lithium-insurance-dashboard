"use client";

import { MoonStar, SunMedium } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className="group relative h-9 w-9 rounded-full border border-border/50 bg-background/60 backdrop-blur-md transition hover:border-primary/50 hover:bg-primary/10"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <SunMedium
        className={`h-4 w-4 text-amber-500 transition duration-300 ${mounted && !isDark ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
      />
      <MoonStar
        className={`absolute h-4 w-4 text-sky-400 transition duration-300 ${mounted && isDark ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
      />
      <span className="sr-only">Toggle colour theme</span>
    </Button>
  );
}
