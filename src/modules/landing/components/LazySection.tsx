import { useRef, useState, useEffect, Suspense, ComponentType, lazy } from "react";

type LazyFactory = () => Promise<{ default: ComponentType }>;

const LazySection = ({ factory, rootMargin = "200px" }: { factory: LazyFactory; rootMargin?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [Component, setComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const Lazy = lazy(factory);
          setComponent(() => Lazy);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [factory, rootMargin]);

  if (!Component) return <div ref={ref} style={{ minHeight: 100 }} />;

  return (
    <Suspense fallback={<div style={{ minHeight: 100 }} />}>
      <Component />
    </Suspense>
  );
};

export default LazySection;
