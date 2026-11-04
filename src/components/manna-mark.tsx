/**
 * Manna's logo: a footed bowl heaped with manna as more falls in. Drawn on
 * Tabler's 24px grid and 2px stroke so it sits alongside the icon set.
 */
export function MannaMark(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M3 11h18" />
      <path d="M5 11c0 4 3 7 7 7s7-3 7-7" />
      <path d="M8.5 21h7" />
      <path d="M12 18v3" />
      <path d="M7 11c1.4-1.9 3-2.8 5-2.8s3.6.9 5 2.8" />
      <circle cx="10" cy="3.2" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="14" cy="5.4" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  )
}
