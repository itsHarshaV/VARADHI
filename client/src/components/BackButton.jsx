import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ onClick, title = 'Back', className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      title={title}
      className={[
        'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50',
        className,
      ].join(' ')}
    >
      <ArrowLeft size={18} />
    </button>
  );
}
