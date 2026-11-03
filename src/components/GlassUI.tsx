import React from 'react';
import { X } from 'lucide-react';

import {
  triggerHaptic,
  getZoomHapticType,
  setHapticsEnabled,
  isHapticsEnabled,
  type HapticType,
} from '../engine/hapticsEngine';

export {
  triggerHaptic,
  getZoomHapticType,
  setHapticsEnabled,
  isHapticsEnabled,
  type HapticType,
};

export interface GlassCircleButtonProps {
  onClick: () => void;
  ariaLabel: string;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export const GlassCircleButton: React.FC<GlassCircleButtonProps> = ({
  onClick,
  ariaLabel,
  active = false,
  size = 'md',
  children,
  className = '',
  disabled = false,
  title,
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'w-9 h-9 min-w-[36px] min-h-[36px]'
      : size === 'lg'
        ? 'w-12 h-12 min-w-[48px] min-h-[48px]'
        : 'w-10 h-10 min-w-[40px] min-h-[40px]';

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) {
          triggerHaptic(8);
          onClick();
        }
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      title={title || ariaLabel}
      className={`glass-control ${sizeClasses} ${
        active ? 'active' : ''
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <span className="relative z-10 flex items-center justify-center">{children}</span>
    </button>
  );
};

export interface GlassButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  variant?: 'glass' | 'amber' | 'primary' | 'danger';
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  onClick,
  children,
  active = false,
  variant = 'glass',
  className = '',
  ariaLabel,
  disabled = false,
}) => {
  const variantClasses =
    variant === 'primary' || variant === 'amber' || active
      ? 'bg-white text-black font-semibold shadow-sm'
      : variant === 'danger'
        ? 'bg-rose-500/20 border border-rose-400/35 text-rose-200 hover:bg-rose-500/30 backdrop-blur-xl'
        : 'liquid-glass-pill text-white/90 hover:text-white hover:bg-white/15';

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) {
          triggerHaptic(8);
          onClick();
        }
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`relative min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-medium tracking-tight flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${variantClasses} ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
};

export interface GlassPillProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const GlassPill: React.FC<GlassPillProps> = ({
  children,
  onClick,
  active = false,
  className = '',
  ariaLabel,
}) => {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          triggerHaptic(6);
          onClick();
        }}
        aria-label={ariaLabel}
        aria-pressed={active}
        className={`min-h-[34px] px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
          active
            ? 'bg-white text-black font-semibold'
            : 'liquid-glass-pill text-white/85 hover:text-white'
        } ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <div
      className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 liquid-glass-pill text-white/90 ${className}`}
    >
      {children}
    </div>
  );
};

export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  heavy?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  heavy = false,
}) => {
  return (
    <div
      className={`rounded-3xl p-4 ${
        heavy ? 'liquid-glass-heavy' : 'liquid-glass'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export interface GlassSliderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (val: number) => string;
  onChange: (val: number) => void;
  onReset?: () => void;
  className?: string;
}

export const GlassSlider: React.FC<GlassSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  formatValue,
  onChange,
  onReset,
  className = '',
}) => {
  const displayVal = formatValue ? formatValue(value) : `${value}${unit}`;
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100));

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-white/80">{label}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono-tabular text-white font-semibold">
              {displayVal}
            </span>
            {onReset && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(6);
                  onReset();
                }}
                className="text-[11px] text-white/55 hover:text-white underline cursor-pointer px-1 py-0.5"
                aria-label={`Reset ${label}`}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
      {/* Fine iOS tick-ruler slider */}
      <div className="relative flex items-center h-7">
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute w-4 h-4 rounded-full bg-white shadow-md border border-black/20 transition-transform duration-75"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
};

export interface GlassToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const GlassToggle: React.FC<GlassToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">{label}</span>
        {description && (
          <span className="text-xs text-white/55">{description}</span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            triggerHaptic(10);
            onChange(!checked);
          }
        }}
        className={`relative w-12 h-7 min-h-[28px] rounded-full transition-colors duration-200 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
          checked
            ? 'bg-emerald-500'
            : 'bg-white/20'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

export interface GlassBottomSheetProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
  maxHeight?: string;
}

export const GlassBottomSheet: React.FC<GlassBottomSheetProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  maxWidthClass = 'max-w-2xl',
  maxHeight = 'max-h-[85vh]',
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClass} ${maxHeight} flex flex-col rounded-t-3xl sm:rounded-3xl glass-bottom-sheet overflow-hidden pb-[env(safe-area-inset-bottom)]`}
      >
        <div className="w-10 h-1.5 bg-white/30 rounded-full mx-auto mt-2.5 mb-1 shrink-0 cursor-pointer" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-white/55">{subtitle}</p>
            )}
          </div>
          <GlassCircleButton
            size="sm"
            ariaLabel={`Close ${title}`}
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </GlassCircleButton>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">{children}</div>
      </div>
    </div>
  );
};
