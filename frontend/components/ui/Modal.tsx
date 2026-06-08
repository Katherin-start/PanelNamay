'use client';

import { ReactNode, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

type ModalVariant = 'default' | 'danger' | 'info';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: ModalVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  closeOnOverlay?: boolean;
}

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

const VARIANT_STYLES: Record<ModalVariant, { bg: string; text: string; ring: string }> = {
  default: { bg: 'bg-namay-navy',  text: 'text-white',  ring: 'ring-white/20' },
  danger:  { bg: 'bg-namay-coral', text: 'text-white',  ring: 'ring-white/30' },
  info:    { bg: 'bg-namay-steel', text: 'text-white',  ring: 'ring-white/20' },
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  variant = 'default',
  size = 'md',
  icon,
  closeOnOverlay = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const v = VARIANT_STYLES[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-namay-navy/55 backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'bg-white rounded-2xl shadow-modal w-full overflow-hidden animate-scale-in',
          SIZE_MAP[size],
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center gap-3 px-6 py-4', v.bg)}>
          {icon && (
            <div className={cn('w-10 h-10 rounded-xl bg-white/15 ring-1 flex items-center justify-center flex-shrink-0', v.ring)}>
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{title}</h2>
            {subtitle && <p className="text-xs text-white/70 truncate mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 pb-5 pt-2 border-t border-gray-100 bg-gray-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface ModalActionsProps {
  onCancel: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
  loadingLabel?: string;
}

export function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'primary',
  loading = false,
  loadingLabel,
}: ModalActionsProps) {
  return (
    <div className="flex gap-3">
      <button type="button" onClick={onCancel} className="btn-cancel flex-1">
        {cancelLabel}
      </button>
      {onConfirm && (
        <button
          type="submit"
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-btn transition-all duration-150',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            confirmVariant === 'danger'
              ? 'bg-namay-coral hover:bg-namay-coral/90 shadow-coral'
              : 'bg-namay-coral hover:bg-namay-coral/90 shadow-coral',
          )}
        >
          {loading ? (loadingLabel ?? 'Guardando...') : confirmLabel}
        </button>
      )}
    </div>
  );
}
