export default function ChannelCardSkeleton() {
  return (
    <div className="glass-card p-5" aria-hidden="true">
      <div className="skeleton h-5 w-3/4 mb-3" />
      <div className="skeleton h-4 w-full mb-1.5" />
      <div className="skeleton h-4 w-2/3 mb-4" />
      <div className="skeleton h-1.5 w-full rounded-full mb-3" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="skeleton h-5 w-12 rounded-full" />
          <div className="skeleton h-4 w-8" />
          <div className="skeleton h-4 w-12" />
        </div>
        <div className="flex items-center gap-2">
          <div className="skeleton h-5 w-5 rounded-full" />
          <div className="skeleton h-4 w-10" />
        </div>
      </div>
    </div>
  );
}
