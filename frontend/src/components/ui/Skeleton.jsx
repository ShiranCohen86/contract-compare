import './Skeleton.scss';

export function SkeletonLine({ width = '100%', height = 16 }) {
  return <span className="skeleton-line" style={{ width, height }} />;
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="skeleton-card">
      <SkeletonLine width="60%" height={18} />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={i === rows - 1 ? '40%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonContractList({ count = 3 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} rows={2} />
      ))}
    </div>
  );
}

export function SkeletonClauseList({ count = 4 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <SkeletonLine width="30%" height={14} />
          <SkeletonLine width="100%" />
          <SkeletonLine width="85%" />
          <SkeletonLine width="60%" />
        </div>
      ))}
    </div>
  );
}
