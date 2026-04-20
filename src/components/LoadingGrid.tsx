export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="cyber-panel corner-cuts p-5 h-56 animate-pulse">
          <div className="h-3 w-24 bg-neon-cyan/10 mb-4" />
          <div className="h-6 w-40 bg-neon-cyan/20 mb-3" />
          <div className="h-3 w-full bg-muted/60 mb-2" />
          <div className="h-3 w-3/4 bg-muted/60 mb-6" />
          <div className="h-8 w-full bg-neon-cyan/10" />
        </div>
      ))}
    </div>
  );
}
