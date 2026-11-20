import type { IconType } from "react-icons";

// react-icons has no Lightroom glyph; this mirrors the Tabler "Ps" icon style (rounded square + letters).
export const BrandAdobeLightroom: IconType = ({ size = "1em", color, className, style, title, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color ?? "currentColor"}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    {...rest}
  >
    {title ? <title>{title}</title> : null}
    <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    <path d="M7 8v8h3" />
    <path d="M14 16v-5.5M14 12.5a2 2 0 0 1 2-1.5" />
  </svg>
);
