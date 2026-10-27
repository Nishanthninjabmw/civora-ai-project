import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getBackendOrigin } from '../api/axios';

export const normalizeImageUrl = (url?: string): string => {
  if (!url) return '';
  const origin = getBackendOrigin();
  // If url is already an absolute HTTP/HTTPS URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (origin && /^https?:\/\/(localhost|127\.0\.0\.1):(5000|5001)/.test(url)) {
      return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):(5000|5001)/, origin);
    }
    return url;
  }
  // If relative path like /uploads/..., attach backend origin if available
  if (origin && url.startsWith('/')) {
    return `${origin}${url}`;
  }
  return url;
};

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = 'Hazard photograph',
  className = '',
  fallbackText = 'Photograph unavailable',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = normalizeImageUrl(src);

  if (!normalizedSrc || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-brand-charcoal/80 border border-brand-border/60 text-brand-gray p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="w-7 h-7 mb-1.5 text-brand-gray/50" />
        <span className="text-xs font-medium text-brand-gray/70 text-center">{fallbackText}</span>
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
};
