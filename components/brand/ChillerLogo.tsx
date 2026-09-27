import React from "react";

export interface ChillerLogoProps {
  className?: string;
  iconClassName?: string;
  variant?: "icon" | "wordmark" | "full" | "monochrome" | "light" | "dark" | "mono";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  withText?: boolean;
  showTagline?: boolean;
  onClick?: () => void;
}

export function ChillerLogo({
  className = "",
  iconClassName = "",
  variant = "full",
  size = "md",
  withText = true,
  showTagline = false,
  onClick,
}: ChillerLogoProps) {
  // Normalize variant aliases
  const isMono = variant === "monochrome" || variant === "mono";
  const isLight = variant === "light";
  const isIconOnly = variant === "icon" || !withText;
  const isWordmarkOnly = variant === "wordmark";

  // Derive size classes
  const sizeMap = {
    xs: { icon: "w-5 h-5", text: "text-base tracking-[0.10em]", gap: "gap-1.5" },
    sm: { icon: "w-7 h-7", text: "text-lg tracking-[0.11em]", gap: "gap-2" },
    md: { icon: "w-8 h-8", text: "text-xl tracking-[0.12em]", gap: "gap-2.5" },
    lg: { icon: "w-10 h-10", text: "text-2xl tracking-[0.13em]", gap: "gap-3" },
    xl: { icon: "w-14 h-14", text: "text-4xl tracking-[0.14em]", gap: "gap-3.5" },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Fills & Gradients
  const cFill = isMono ? "#FFFFFF" : isLight ? "#09090C" : "url(#chiller-c-grad)";
  const triFill = isMono ? "#FFFFFF" : isLight ? "#09090C" : "url(#chiller-tri-grad)";
  const textColor = isLight ? "text-[#09090C]" : isMono ? "text-white" : "text-[#F8FAFC]";

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center select-none cursor-pointer group ${currentSize.gap} ${className}`}
      role="banner"
      aria-label="CHILLER"
    >
      {/* C + Play Vector Emblem */}
      {!isWordmarkOnly && (
        <div className={`relative shrink-0 flex items-center justify-center ${iconClassName || currentSize.icon}`}>
          <svg
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="chiller-c-grad" x1="100" y1="120" x2="260" y2="430" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="42%" stopColor="#FFFFFF" />
                <stop offset="56%" stopColor="#FFA8BC" />
                <stop offset="72%" stopColor="#FF3B6B" />
                <stop offset="100%" stopColor="#FF1A50" />
              </linearGradient>
              <linearGradient id="chiller-tri-grad" x1="208" y1="208" x2="312" y2="304" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FF4776" />
                <stop offset="100%" stopColor="#FF2458" />
              </linearGradient>
            </defs>

            {/* The "C" Symbol */}
            <path
              d="M 340 146 A 168 168 0 1 0 356 330 L 300 284 A 82 82 0 1 1 284 198 Z"
              fill={cFill}
              stroke={cFill}
              strokeWidth="12"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* The Play Triangle */}
            <path
              d="M 221 208 L 295.1 246.9 Q 312 256 295.1 265.1 L 221 304 Q 208 304 208 291 L 208 221 Q 208 208 221 208 Z"
              fill={triFill}
            />
          </svg>
        </div>
      )}

      {/* Typography Wordmark */}
      {!isIconOnly && (
        <div className="flex flex-col justify-center leading-none">
          <span
            className={`font-black uppercase font-sans ${currentSize.text} ${textColor} transition-colors group-hover:text-white`}
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
            }}
          >
            CHILLER
          </span>
          {showTagline && (
            <span className="text-[8px] font-bold tracking-[0.24em] text-zinc-400 uppercase mt-0.5 group-hover:text-[#FF3B6B] transition-colors">
              Movies &bull; Anime &bull; Series
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Aliases for backward compatibility
export const VeloraLogo = ChillerLogo;
export default ChillerLogo;
