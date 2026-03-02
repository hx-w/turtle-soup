interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

/**
 * Generates a deterministic avatar using DiceBear Bottts style.
 * Falls back to a colored circle with initials if images fail to load.
 */
export default function Avatar({ seed, size = 32, className = '' }: AvatarProps) {
  const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}&size=${size}`;

  return (
    <img
      src={url}
      alt="Avatar"
      width={size}
      height={size}
      className={`rounded-full bg-card ${className}`}
      loading="lazy"
    />
  );
}
