import { X } from 'lucide-react';
import { cn } from '../utils/cn';

export function Card({ children, className }) {
  return <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100', className)}>{children}</div>;
}

export function CardBody({ children, className }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

export function Button({ children, variant = 'primary', className, ...props }) {
  const variants = {
    primary: 'bg-jaboque-navy text-white hover:bg-jaboque-navy-light shadow-sm',
    secondary: 'bg-white border border-gray-300 text-jaboque-navy hover:bg-orange-50 hover:border-jaboque-orange/40',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    orange: 'bg-jaboque-orange text-white hover:bg-jaboque-orange-dark shadow-sm',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>}
      <input
        className={cn(
          'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-jaboque-orange focus:border-transparent outline-none',
          className
        )}
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>}
      <select
        className={cn(
          'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-jaboque-orange outline-none bg-white',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>}
      <textarea
        className={cn(
          'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-jaboque-orange outline-none resize-y min-h-[80px]',
          className
        )}
        {...props}
      />
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={cn('bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto', wide ? 'max-w-2xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-jaboque-navy">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-jaboque-navy">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Loading({ full }) {
  return (
    <div className={cn('flex justify-center py-12', full && 'min-h-[50vh] items-center')}>
      <div className="w-10 h-10 border-4 border-jaboque-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function KpiCard({ title, value, subtitle, accent, warning }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-gray-500">{title}</p>
        <p className={cn('text-2xl font-bold mt-1', accent && 'text-jaboque-navy')}>{value}</p>
        {subtitle && (
          <p className={cn('text-xs mt-2', warning ? 'text-amber-600' : 'text-gray-400')}>{subtitle}</p>
        )}
      </CardBody>
    </Card>
  );
}

export function Stepper({ steps, current }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, i) => {
        const num = i + 1;
        const active = num === current;
        const done = num < current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2',
                  active && 'bg-jaboque-orange border-jaboque-orange text-white',
                  done && 'bg-jaboque-navy border-jaboque-navy text-white',
                  !active && !done && 'border-gray-300 text-gray-400 bg-white'
                )}
              >
                {num}
              </div>
              <span
                className={cn(
                  'text-xs mt-2 hidden sm:block',
                  active ? 'text-jaboque-orange font-medium' : 'text-gray-500'
                )}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-2', done ? 'bg-jaboque-navy' : 'bg-gray-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
