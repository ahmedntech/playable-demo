// bigwolf studio mark — a geometric wolf head used in the header and footer.
export function WolfMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="bigwolf" role="img">
      <defs>
        <linearGradient id="bw-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a7bff" />
          <stop offset="1" stopColor="#5b8cff" />
        </linearGradient>
      </defs>
      <path
        d="M10 6 L24 22 H40 L54 6 L51 32 C51 47 43 58 32 58 C21 58 13 47 13 32 Z"
        fill="url(#bw-grad)"
      />
      <circle cx="25" cy="33" r="3.4" fill="#0b0e17" />
      <circle cx="39" cy="33" r="3.4" fill="#0b0e17" />
      <path d="M27 43 L32 48 L37 43 Z" fill="#0b0e17" />
    </svg>
  );
}
