'use client';

import React, { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { ImageOff } from 'lucide-react';

export interface OptimizedImageProps extends Omit<ImageProps, 'onError'> {
  fallbackSrc?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * OptimizedImage
 *
 * Senior Engineering Architecture for Image Delivery on Vercel:
 * 1. Automatically enforces `unoptimized={true}` for SVGs, vector assets, small icons (<= 64px),
 *    and pre-optimized CDNs (such as GitHub user avatars) to eliminate unnecessary Vercel transformations.
 * 2. Gracefully falls back to direct unoptimized delivery if Vercel Image Optimization returns HTTP 402/403/500
 *    (e.g., when the team transformation quota is exhausted).
 * 3. Enforces sensible responsive `sizes` to prevent mobile viewports from requesting desktop-wide image variants.
 * 4. Displays an accessible, layout-stable placeholder to avoid Cumulative Layout Shift (CLS) if loading fails.
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  unoptimized,
  sizes,
  fallbackSrc,
  className = '',
  onError,
  ...rest
}: OptimizedImageProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [attemptedDirectFallback, setAttemptedDirectFallback] = useState(false);

  // Detect SVGs and vector assets that gain zero compression benefit from Vercel's raster optimizer
  const isSvg =
    typeof src === 'string' &&
    (src.endsWith('.svg') || src.startsWith('data:image/svg+xml') || src.includes('.svg?'));

  // Detect small icons/thumbnails where transformation overhead exceeds payload savings
  const isSmallIcon =
    typeof width === 'number' &&
    typeof height === 'number' &&
    width <= 64 &&
    height <= 64;

  // Detect pre-optimized external CDNs (like GitHub avatars which already serve sized WebP/PNGs)
  const isPreOptimizedCdn =
    typeof src === 'string' &&
    (src.includes('avatars.githubusercontent.com') || src.includes('github.com/identicons'));

  const shouldBypassOptimization =
    unoptimized ?? (isSvg || isSmallIcon || isPreOptimizedCdn || attemptedDirectFallback);

  // Enforce responsive sizes when fill is active to avoid requesting desktop widths on mobile screens
  const effectiveSizes =
    sizes || (fill ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw' : undefined);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // If the image failed through Vercel's optimizer (e.g., 402 Quota Exceeded), attempt direct unoptimized load
    if (!shouldBypassOptimization && !attemptedDirectFallback) {
      setAttemptedDirectFallback(true);
      return;
    }

    setLoadFailed(true);
    if (onError) {
      onError(e);
    }
  };

  // If loading completely failed even after direct fallback attempts
  if (loadFailed) {
    if (fallbackSrc) {
      return (
        <Image
          {...rest}
          src={fallbackSrc}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          sizes={effectiveSizes}
          unoptimized={true}
          className={className}
        />
      );
    }

    // Accessible, layout-stable placeholder preventing CLS
    return (
      <div
        role="img"
        aria-label={alt || 'Image preview unavailable'}
        style={{
          width: fill ? '100%' : width ? `${width}px` : 'auto',
          height: fill ? '100%' : height ? `${height}px` : 'auto',
        }}
        className={`flex flex-col items-center justify-center rounded-lg border border-dark-600 bg-dark-800 p-3 text-center text-dark-400 ${className}`}
      >
        <ImageOff className="h-5 w-5 text-dark-500" />
        <span className="mt-1 text-[11px] font-medium text-dark-300 line-clamp-1">
          {alt || 'Image unavailable'}
        </span>
      </div>
    );
  }

  return (
    <Image
      {...rest}
      src={src}
      alt={alt}
      width={width}
      height={height}
      fill={fill}
      sizes={effectiveSizes}
      unoptimized={shouldBypassOptimization}
      onError={handleError}
      className={className}
    />
  );
}

export default OptimizedImage;
