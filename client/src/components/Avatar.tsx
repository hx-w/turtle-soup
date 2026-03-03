interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

/**
 * Generates a deterministic avatar using DiceBear Thumbs style.
 * Consistent with profile page and channel components.
 */
export default function Avatar({ seed, size = 32, className = '' }: AvatarProps) {
  const url = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;

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
