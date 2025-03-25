"use client";

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/theme-context';

export function ThemeToggle({ variant = 'slider' }: { variant?: 'slider' | 'button' }) {
  const { theme, toggleTheme } = useTheme();

  if (variant === 'slider') {
    return (
      <div
        onClick={toggleTheme}
        className={`relative w-[4.2rem] h-8 rounded-full border p-1 cursor-pointer transition-colors ${theme === 'light' ? 'bg-[#E8F2FF] border-[#2C2B2B4D]' : 'bg-[#0ABAB533] border-[#D9CFB44D]'}`}
      >
        <div
          className={`absolute w-6 h-6 rounded-full bg-white dark:bg-[#251342] shadow-md transform transition-transform flex items-center justify-center
            ${theme === 'light' ? 'translate-x-0' : 'translate-x-9'}`}
        >
          {theme === 'light' ? (
            <Sun className="h-4 w-4 text-yellow-500" />
          ) : (
            <Moon className="h-4 w-4 text-[#D9CFB4]" />
          )}
        </div>
        <span className={`absolute text-xs font-medium ${theme === 'light' ? 'right-2' : 'left-2'} top-1/2 transform -translate-y-1/2`}>
          {theme === 'light' ? 'Dark' : 'Light'}
        </span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={toggleTheme}
      className="gap-2 px-4"
    >
      {theme === 'light' ? (
        <>
          <Moon className="h-5 w-5" />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="h-5 w-5" />
          <span>Light Mode</span>
        </>
      )}
    </Button>
  );
}