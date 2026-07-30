import { useState, useCallback } from 'react';

interface ProductHeroImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

const BLUR_PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23e2e8f0' width='40' height='40'/%3E%3C/svg%3E`;

export default function ProductHeroImage({
  src,
  alt,
  className = '',
  width = 400,
  height = 400,
}: ProductHeroImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setError(true), []);

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* Blur placeholder shown while loading */}
      <img
        src={BLUR_PLACEHOLDER}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
        width={40}
        height={40}
      />

      {/* Actual product image */}
      <img
        src={error ? BLUR_PLACEHOLDER : src}
        alt={alt}
        loading="eager"
        fetchPriority="high"
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        decoding="async"
      />
    </div>
  );
}
