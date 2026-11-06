const colors = ["#5268F4", "#7CDE42", "#FFD43B", "#D836DE", "#F36C64", "#43AFE5", "#B18AF7", "#FF9D50"];

/** Simple geometric marks inspired by the portfolio's playful visual language. */
export function ExpertiseSymbol({ index }: { index: number }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="currentColor"
      aria-hidden="true"
      className="size-14 shrink-0 transition-transform duration-300 group-hover:rotate-12 motion-reduce:transform-none md:size-16"
      style={{ color: colors[index % colors.length] }}
    >
      {index === 0 && <>
        <path d="m22 40 35-21 5 8-35 21zm0-4 40 21-5 9-40-22z" />
        <circle cx="19" cy="40" r="12" /><circle cx="58" cy="20" r="12" /><circle cx="58" cy="60" r="12" />
      </>}
      {index === 1 && <path d="M24 6a18 18 0 0 1 18 18c0 8 6 14 14 14a18 18 0 1 1-18 18c0-8-6-14-14-14a18 18 0 1 1 0-36Z" />}
      {index === 2 && <>
        {[0, 60, 120].map((angle) => <rect key={angle} x="29" y="5" width="22" height="70" rx="11" transform={`rotate(${angle} 40 40)`} />)}
      </>}
      {index === 3 && <>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => <rect key={angle} x="33" y="3" width="14" height="25" rx="7" transform={`rotate(${angle} 40 40)`} />)}
      </>}
      {index === 4 && <>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => <circle key={angle} cx="40" cy="18" r="12" transform={`rotate(${angle} 40 40)`} />)}
        <circle cx="40" cy="40" r="9" />
      </>}
      {index === 5 && <>
        <path d="m22 19 39 39-6 6-39-39Z" />
        {[[22, 18], [18, 39], [43, 18], [58, 41], [38, 62], [59, 62]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="11" />)}
      </>}
      {index === 6 && <path d="m40 3 9 24 25-7-16 20 16 20-25-7-9 24-9-24-25 7 16-20L6 20l25 7Z" />}
      {index === 7 && <>
        <path d="m12 48 23-23 14 14 19-19v20L49 59 35 45 12 68Z" />
        <circle cx="18" cy="18" r="9" />
      </>}
    </svg>
  );
}
