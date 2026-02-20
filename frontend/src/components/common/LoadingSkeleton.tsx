import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
  type?: 'card' | 'row' | 'chart';
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--surface) 0%, var(--surface-2) 50%, var(--surface) 100%)',
  backgroundSize: '200% 100%',
  animation: 'tsShimmer 1.5s ease-in-out infinite',
  borderRadius: 8,
};

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 3, type = 'card' }) => {
  if (type === 'chart') {
    return (
      <div style={{
        ...shimmerStyle,
        height: 320,
        borderRadius: 12,
        border: '1px solid var(--border)',
      }} />
    );
  }

  if (type === 'row') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            ...shimmerStyle,
            height: 48,
            border: '1px solid var(--border)',
          }} />
        ))}
      </div>
    );
  }

  return (
    <div className="ts-cards-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          ...shimmerStyle,
          height: 200,
          border: '1px solid var(--border)',
          borderRadius: 12,
        }} />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
