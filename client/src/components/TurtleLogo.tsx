interface TurtleLogoProps {
  className?: string;
  size?: number;
}

export default function TurtleLogo({ className = '', size = 40 }: TurtleLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Shell */}
      <ellipse cx="32" cy="30" rx="18" ry="14" fill="#7c6ff7" />
      <ellipse cx="32" cy="30" rx="18" ry="14" fill="url(#shellGrad)" />
      {/* Shell pattern */}
      <path
        d="M32 16 L32 44"
        stroke="#9d93fa"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M22 20 Q32 30 22 40"
        stroke="#9d93fa"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M42 20 Q32 30 42 40"
        stroke="#9d93fa"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      {/* Head */}
      <circle cx="52" cy="28" r="5" fill="#51cf66" />
      <circle cx="54" cy="27" r="1.5" fill="rgb(var(--color-bg))" />
      {/* Legs */}
      <ellipse cx="20" cy="40" rx="4" ry="3" fill="#51cf66" transform="rotate(-20 20 40)" />
      <ellipse cx="44" cy="40" rx="4" ry="3" fill="#51cf66" transform="rotate(20 44 40)" />
      <ellipse cx="20" cy="22" rx="4" ry="3" fill="#51cf66" transform="rotate(20 20 22)" />
      <ellipse cx="44" cy="22" rx="4" ry="3" fill="#51cf66" transform="rotate(-20 44 22)" />
      {/* Tail */}
      <path
        d="M14 30 Q8 30 10 34"
        stroke="#51cf66"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Soup bowl beneath - subtle */}
      <path
        d="M12 48 Q32 56 52 48"
        stroke="#ffd43b"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M10 48 L54 48"
        stroke="#ffd43b"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* Steam */}
      <path
        d="M26 12 Q28 8 26 4"
        stroke="#ffd43b"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
      <path
        d="M34 10 Q36 6 34 2"
        stroke="#ffd43b"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
      <defs>
        <linearGradient id="shellGrad" x1="14" y1="16" x2="50" y2="44">
          <stop offset="0%" stopColor="#9d93fa" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7c6ff7" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
