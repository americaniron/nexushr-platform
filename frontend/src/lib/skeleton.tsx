/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Skeleton & Loading Components — Route-level code splitting support
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { Suspense, lazy, ComponentType } from 'react';

// ══════════════════════════════════════════════════════
// Skeleton Primitives
// ══════════════════════════════════════════════════════

export function SkeletonBlock({ width, height, rounded = '12px', className = '' }: {
  width?: string;
  height?: string;
  rounded?: string;
  className?: string;
}) {
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        width: width || '100%',
        height: height || '20px',
        borderRadius: rounded,
        background: 'linear-gradient(90deg, var(--bg-hover, #F3F4F6) 25%, var(--bg-secondary, #E5E7EB) 50%, var(--bg-hover, #F3F4F6) 75%)',
        backgroundSize: '400px 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}

export function SkeletonText({ lines = 3, widths }: { lines?: number; widths?: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={widths?.[i] || (i === lines - 1 ? '60%' : '100%')}
          height="14px"
          rounded="6px"
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = '48px' }: { size?: string }) {
  return <SkeletonBlock width={size} height={size} rounded="50%" />;
}

export function SkeletonCard({ height = '180px' }: { height?: string }) {
  return (
    <div style={{
      background: 'var(--bg-card, #FFF)',
      border: '1px solid var(--border-light, rgba(0,0,0,0.06))',
      borderRadius: '20px',
      padding: '28px',
    }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <SkeletonCircle size="44px" />
        <div style={{ flex: 1 }}>
          <SkeletonBlock width="40%" height="18px" rounded="8px" />
          <div style={{ height: '8px' }} />
          <SkeletonBlock width="65%" height="12px" rounded="6px" />
        </div>
      </div>
      <SkeletonText lines={3} widths={['100%', '90%', '70%']} />
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Page-Level Skeletons
// ══════════════════════════════════════════════════════

export function DashboardSkeleton() {
  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <SkeletonBlock width="250px" height="36px" rounded="10px" />
      <div style={{ height: '24px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            background: 'var(--bg-card, #FFF)',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid var(--border-light, rgba(0,0,0,0.06))',
          }}>
            <SkeletonBlock width="50%" height="14px" rounded="6px" />
            <div style={{ height: '12px' }} />
            <SkeletonBlock width="80px" height="36px" rounded="8px" />
            <div style={{ height: '8px' }} />
            <SkeletonBlock width="70%" height="12px" rounded="6px" />
          </div>
        ))}
      </div>
      <div style={{ height: '32px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

export function WorkspaceSkeleton() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar skeleton */}
      <div style={{
        width: '300px',
        borderRight: '1px solid var(--border-light, rgba(0,0,0,0.06))',
        padding: '24px',
        background: 'var(--bg-secondary, #F9FAFB)',
      }}>
        <SkeletonCircle size="80px" />
        <div style={{ height: '16px' }} />
        <SkeletonBlock width="60%" height="22px" rounded="8px" />
        <div style={{ height: '8px' }} />
        <SkeletonBlock width="80%" height="14px" rounded="6px" />
        <div style={{ height: '24px' }} />
        <SkeletonText lines={5} />
      </div>
      {/* Chat area skeleton */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'flex-end' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: i % 2 ? 'flex-start' : 'flex-end', flexDirection: i % 2 ? 'row' : 'row-reverse' }}>
              <SkeletonCircle size="36px" />
              <SkeletonBlock width={i === 2 ? '45%' : '60%'} height="60px" rounded="16px" />
            </div>
          ))}
        </div>
        <div style={{ height: '16px' }} />
        <SkeletonBlock height="56px" rounded="28px" />
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <SkeletonBlock width="200px" height="32px" rounded="10px" />
      <div style={{ height: '32px' }} />
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ marginBottom: '24px' }}>
          <SkeletonBlock width="120px" height="16px" rounded="6px" />
          <div style={{ height: '10px' }} />
          <SkeletonBlock height="48px" rounded="12px" />
        </div>
      ))}
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <SkeletonBlock width="300px" height="40px" rounded="10px" className="mx-auto" />
        <div style={{ height: '12px' }} />
        <SkeletonBlock width="500px" height="18px" rounded="8px" className="mx-auto" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} height="240px" />)}
      </div>
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <SkeletonBlock width="250px" height="32px" rounded="10px" />
      <div style={{ height: '24px' }} />
      <SkeletonText lines={4} />
      <div style={{ height: '32px' }} />
      <SkeletonCard />
      <div style={{ height: '20px' }} />
      <SkeletonCard />
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Lazy Loading Wrapper
// ══════════════════════════════════════════════════════

export function lazyPage<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T } | { [key: string]: T }>,
  exportName?: string,
  FallbackSkeleton: React.FC = GenericPageSkeleton
): React.FC {
  const LazyComponent = lazy(async () => {
    const module = await importFn();
    if ('default' in module) return module as { default: T };
    if (exportName && exportName in module) return { default: (module as any)[exportName] };
    // Try first named export
    const firstExport = Object.values(module)[0];
    if (firstExport) return { default: firstExport as T };
    throw new Error('Module has no default export');
  });

  return function LazyPageWrapper(props: any) {
    return (
      <Suspense fallback={<FallbackSkeleton />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ══════════════════════════════════════════════════════
// Page Loading Progress Bar
// ══════════════════════════════════════════════════════

export function PageLoadingBar() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      zIndex: 9999,
      background: 'var(--bg-secondary, #F3F4F6)',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        background: 'linear-gradient(90deg, var(--color-golden, #FBCC00), var(--color-golden-light, #FDE68A))',
        animation: 'loading-bar 1.5s ease-in-out infinite',
        width: '40%',
        borderRadius: '0 2px 2px 0',
      }} />
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
