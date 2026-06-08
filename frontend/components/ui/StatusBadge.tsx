import { cn } from '@/lib/utils';

type StatusKind = 'appointment' | 'payment' | 'patient' | 'role' | 'generic';

interface StatusConfig {
  bg: string;
  text: string;
  label: string;
  dot?: string;
}

export const APPOINTMENT_STATUS: Record<string, StatusConfig> = {
  pendiente:   { bg: '#FEF9C3', text: '#92400E', label: 'PENDIENTE' },
  confirmada:  { bg: '#DCFCE7', text: '#16A34A', label: 'CONFIRMADA' },
  completada:  { bg: '#DBEAFE', text: '#1D4ED8', label: 'COMPLETADA' },
  cancelada:   { bg: '#FEE2E2', text: '#DC2626', label: 'CANCELADA' },
  programada:  { bg: '#EDE9FE', text: '#6D28D9', label: 'PROGRAMADA' },
};

export const PAYMENT_STATUS: Record<string, StatusConfig> = {
  completado: { bg: '#DCFCE7', text: '#16A34A', label: 'COMPLETADO' },
  pagado:     { bg: '#DCFCE7', text: '#16A34A', label: 'PAGADO' },
  pendiente:  { bg: '#FEF9C3', text: '#92400E', label: 'PENDIENTE' },
  fallido:    { bg: '#FEE2E2', text: '#DC2626', label: 'FALLIDO' },
  cancelado:  { bg: '#F3F4F6', text: '#6B7280', label: 'CANCELADO' },
};

export const PATIENT_STATUS: Record<string, StatusConfig> = {
  activo:   { bg: '#DCFCE7', text: '#16A34A', label: 'ACTIVO' },
  inactivo: { bg: '#FEE2E2', text: '#DC2626', label: 'INACTIVO' },
};

export const ROLE_CONFIG: Record<string, StatusConfig> = {
  ADMINISTRADOR:  { bg: '#FEE2E2', text: '#991B1B', label: 'Administrador' },
  ODONTOLOGO:     { bg: '#DBEAFE', text: '#1E40AF', label: 'Odontólogo' },
  RECEPCIONISTA:  { bg: '#DCFCE7', text: '#166534', label: 'Recepcionista' },
  CAJERO:         { bg: '#EDE9FE', text: '#5B21B6', label: 'Cajero' },
  PRACTICANTE:    { bg: '#FEF9C3', text: '#713F12', label: 'Practicante' },
};

const STATUS_BY_KIND: Record<StatusKind, Record<string, StatusConfig>> = {
  appointment: APPOINTMENT_STATUS,
  payment:     PAYMENT_STATUS,
  patient:     PATIENT_STATUS,
  role:        ROLE_CONFIG,
  generic:     {},
};

type VariantKind = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const VARIANT_STYLES: Record<VariantKind, { bg: string; text: string; dot: string }> = {
  success: { bg: '#DCFCE7', text: '#166534', dot: '#16A34A' },
  warning: { bg: '#FEF9C3', text: '#92400E', dot: '#CA8A04' },
  danger:  { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  info:    { bg: '#DBEAFE', text: '#1E40AF', dot: '#2563EB' },
  neutral: { bg: '#F1F4F9', text: '#374151', dot: '#6B7280' },
};

interface StatusBadgeProps {
  status?: string;
  kind?: StatusKind;
  config?: StatusConfig;
  variant?: VariantKind;
  showDot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function StatusBadge({
  status,
  kind = 'generic',
  config,
  variant,
  showDot = false,
  className,
  children,
}: StatusBadgeProps) {
  if (variant) {
    const v = VARIANT_STYLES[variant];
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full uppercase tracking-wide',
          className,
        )}
        style={{ backgroundColor: v.bg, color: v.text }}
      >
        {children}
      </span>
    );
  }

  const resolved =
    config ?? STATUS_BY_KIND[kind]?.[status ?? ''] ?? {
      bg: '#F1F4F9',
      text: '#374151',
      label: status,
    };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full uppercase tracking-wide',
        className,
      )}
      style={{ backgroundColor: resolved.bg, color: resolved.text }}
    >
      {(showDot || resolved.dot) && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: resolved.dot ?? resolved.text }}
        />
      )}
      {resolved.label}
    </span>
  );
}
