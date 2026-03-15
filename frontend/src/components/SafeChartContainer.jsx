import { useEffect, useRef, useState } from "react";

export default function SafeChartContainer({ className, minHeight = 280, children }) {
  const hostRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!hostRef.current) return undefined;

    const node = hostRef.current;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={className} style={{ minHeight }}>
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
}
