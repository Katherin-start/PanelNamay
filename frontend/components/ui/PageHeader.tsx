import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-namay-steel">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-2xl lg:text-[28px] font-bold tracking-tight text-namay-navy">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
