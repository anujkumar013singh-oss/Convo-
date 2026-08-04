import { cn } from '../../lib/utils';

const sizeMap = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export default function Avatar({ src, alt, size = 'md', isOnline, className }) {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden bg-bg-hover flex items-center justify-center',
          sizeMap[size]
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt || 'User avatar'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-text-tertiary font-medium">
            {alt ? alt.charAt(0).toUpperCase() : '?'}
          </span>
        )}
      </div>
      {isOnline !== undefined && (
        <StatusDot isOnline={isOnline} size={size} />
      )}
    </div>
  );
}

function StatusDot({ isOnline, size }) {
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : size === 'xl' ? 'w-4 h-4' : 'w-3 h-3';
  const borderSize = size === 'sm' ? 'border' : 'border-2';

  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 rounded-full border-bg-base',
        borderSize,
        dotSize,
        isOnline
          ? 'bg-online-dot animate-pulse-online'
          : 'bg-text-tertiary'
      )}
      aria-label={isOnline ? 'Online' : 'Offline'}
    />
  );
}

export { StatusDot };
