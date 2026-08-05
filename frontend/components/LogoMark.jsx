// Icône officielle : coeur bicolore (rose #fe466c / prune #5b424d) traversé
// par un anneau, conforme à la charte graphique fournie pour le site.
export default function LogoMark({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <clipPath id="heart-clip">
          <path d="M50,20 C42,4 14,4 14,30 C14,52 40,68 50,84 C60,68 86,52 86,30 C86,4 58,4 50,20 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#heart-clip)">
        <rect x="0" y="0" width="100" height="52" fill="#fe466c" />
        <rect x="0" y="52" width="100" height="48" fill="#5b424d" />
      </g>
      <ellipse
        cx="50" cy="48" rx="46" ry="12"
        fill="none" stroke="#5b424d" strokeWidth="7"
        transform="rotate(-16 50 48)"
      />
    </svg>
  );
}
