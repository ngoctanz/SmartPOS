'use client';

import { Minus, Plus } from 'lucide-react';
import { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  maxStock?: number;
  disabled?: boolean;
  className?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 10,
  maxStock,
  disabled = false,
  className,
}: QuantitySelectorProps) {
  // Effective max is the minimum of max and maxStock
  const effectiveMax = maxStock !== undefined ? Math.min(max, maxStock) : max;

  const handleDecrease = useCallback(() => {
    if (value > min && !disabled) {
      onChange(value - 1);
    }
  }, [value, min, disabled, onChange]);

  const handleIncrease = useCallback(() => {
    if (value < effectiveMax && !disabled) {
      onChange(value + 1);
    }
  }, [value, effectiveMax, disabled, onChange]);

  const canDecrease = value > min && !disabled;
  const canIncrease = value < effectiveMax && !disabled;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        onClick={handleDecrease}
        disabled={!canDecrease}
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
          'border-2',
          canDecrease
            ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 active:scale-95'
            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
        )}
      >
        <Minus className="w-4 h-4" />
      </button>

      <div className="min-w-[60px] text-center">
        <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{value}</span>
      </div>

      <button
        type="button"
        onClick={handleIncrease}
        disabled={!canIncrease}
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
          'border-2',
          canIncrease
            ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 active:scale-95'
            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
        )}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
