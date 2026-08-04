import { cn } from '../../lib/utils';

export function Spinner({ size = 'md', className }) {
  const sizeMap = {
    sm: 'w-4 h-4 border-[2px]',
    md: 'w-6 h-6 border-[2px]',
    lg: 'w-10 h-10 border-[3px]',
  };

  return (
    <div
      className={cn(
        'rounded-full border-text-tertiary border-t-accent animate-spin',
        sizeMap[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-base">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-text-secondary text-sm">Loading...</p>
      </div>
    </div>
  );
}

export function InlineLoader({ text = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-3">
        <Spinner size="sm" />
        <p className="text-text-secondary text-sm">{text}</p>
      </div>
    </div>
  );
}
