export default function PageLoader() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-10 w-64 rounded-full bg-secondary/70" />
        <div className="h-4 w-80 rounded-full bg-secondary/50" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 rounded-[1.5rem] border border-border/70 bg-card/80 shadow-card"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-[340px] rounded-[1.75rem] border border-border/70 bg-card/80 shadow-card lg:col-span-2" />
        <div className="h-[340px] rounded-[1.75rem] border border-border/70 bg-card/80 shadow-card" />
      </div>
    </div>
  );
}
