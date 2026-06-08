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

const VARIANT_STYLES: Record<ModalVariant, { accent: string }> = {
  default: { accent: 'text-namay-navy' },
  danger:  { accent: 'text-namay-coral' },
  info:    { accent: 'text-namay-navy' },
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-namay-navy/30 animate-fade-in"
      onClick={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'bg-white border border-gray-100 w-full overflow-hidden animate-scale-in',
          SIZE_MAP[size],
        )}
      >
        {/* Header — plano, sin gradientes */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          {icon && (
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 text-namay-navy border border-gray-100">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className={cn('text-base font-semibold truncate', v.accent)}>{title}</h2>
            {subtitle && <p className="text-[11px] text-namay-steel/60 font-medium truncate mt-0.5 tracking-wide">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-namay-steel/40 hover:text-namay-navy transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100">
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
            'btn-primary flex-1',
            confirmVariant === 'danger' && '!bg-namay-coral hover:!bg-namay-coral/90',
          )}
        >
          {loading ? (loadingLabel ?? 'Guardando...') : confirmLabel}
        </button>
      )}
    </div>
  );
}
