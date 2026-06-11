interface Props {
  className?: string;
}

// Line-art basketball — the subtle "this is hoops" cue, in the museum style.
export default function Basketball({ className }: Props) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="2.5" />
      <path d="M24 3v42" stroke="currentColor" strokeWidth="2.5" />
      <path d="M3 24h42" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M9 9.5c5 4.5 8 9 8 14.5s-3 10-8 14.5"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M39 9.5c-5 4.5-8 9-8 14.5s3 10 8 14.5"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
}
