import { cn } from '../../lib/utils';

function SkeletonBase({ className, ...props }) {
  return (
    <div
      className={cn(
        'bg-bg-hover rounded-md animate-shimmer',
        'bg-gradient-to-r from-bg-hover via-bg-active to-bg-hover bg-[length:200%_100%]',
        className
      )}
      {...props}
    />
  );
}

export function ChatListSkeleton({ count = 6 }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <SkeletonBase className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <SkeletonBase className="h-4 w-24" />
              <SkeletonBase className="h-3 w-10" />
            </div>
            <SkeletonBase className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageSkeleton({ count = 8 }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => {
        const isOut = i % 3 === 0;
        return (
          <div
            key={i}
            className={cn('flex', isOut ? 'justify-end' : 'justify-start')}
          >
            <SkeletonBase
              className={cn(
                'h-10 rounded-lg',
                isOut ? 'w-2/5' : 'w-1/2'
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <SkeletonBase className="w-20 h-20 rounded-full" />
      <SkeletonBase className="h-5 w-32" />
      <SkeletonBase className="h-4 w-24" />
      <div className="w-full space-y-3 mt-4">
        <SkeletonBase className="h-4 w-full" />
        <SkeletonBase className="h-4 w-3/4" />
        <SkeletonBase className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export default SkeletonBase;
