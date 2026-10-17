export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="bg-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4dffb5" />
          <stop offset="1" stopColor="#8b7bff" />
        </linearGradient>
      </defs>
      <path d="M16 2.5c3.6 2 7.4 2.6 11 2.6v10.2c0 7-4.7 11.7-11 14.2C9.7 27 5 22.3 5 15.3V5.1c3.6 0 7.4-.6 11-2.6Z" fill="none" stroke="url(#bg-logo)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="m10.5 15.8 3.8 3.8 7.4-7.6" fill="none" stroke="#4dffb5" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
