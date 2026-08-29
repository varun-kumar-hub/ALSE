import React from 'react';

interface LearnForgeLogoProps {
  size?: number;
  className?: string;
}

export const LearnForgeLogo: React.FC<LearnForgeLogoProps> = ({ size = 20, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-2xs shrink-0 select-none transition-colors ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={Math.round(size * 0.7)}
        height={Math.round(size * 0.7)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Isometric Neural Facet / Learning Forge Crystal */}
        <path
          d="M12 2.5L20.5 7.5V16.5L12 21.5L3.5 16.5V7.5L12 2.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M12 2.5V12M12 12L20.5 7.5M12 12L3.5 7.5M12 12V21.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Core spark node */}
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    </div>
  );
};
