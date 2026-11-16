import { useState } from 'react';
import { Disc3 } from 'lucide-react';

interface CoverArtProps {
  src?: string;
  alt: string;
  className?: string;
  iconSize?: number;
}

export function CoverArt({ src, alt, className = 'w-12 h-12 rounded-md', iconSize = 20 }: CoverArtProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${className} bg-gradient-to-br from-[#23272E] via-[#171A1F] to-[#101215] border border-white/10 flex items-center justify-center shrink-0 select-none`}
        aria-label={alt}
      >
        <Disc3 size={iconSize} className="text-neutral-500" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} object-cover shrink-0 bg-[#171A1F]`}
    />
  );
}
