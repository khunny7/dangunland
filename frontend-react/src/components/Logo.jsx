import React from 'react';

const Logo = ({ size = 32, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer terminal frame */}
      <rect 
        x="4" 
        y="8" 
        width="56" 
        height="48" 
        rx="4" 
        fill="#0a0a0a" 
        stroke="#00ff41" 
        strokeWidth="2"
      />
      
      {/* Terminal header bar */}
      <rect 
        x="4" 
        y="8" 
        width="56" 
        height="8" 
        rx="4" 
        fill="#1a1a1a"
      />
      
      {/* Terminal dots */}
      <circle cx="12" cy="12" r="1.5" fill="#ff5f56"/>
      <circle cx="18" cy="12" r="1.5" fill="#ffbd2e"/>
      <circle cx="24" cy="12" r="1.5" fill="#27ca3f"/>
      
      {/* DangUnLand text effect */}
      <text 
        x="32" 
        y="28" 
        textAnchor="middle" 
        fill="#00ff41" 
        fontSize="6" 
        fontFamily="monospace"
        fontWeight="bold"
      >
        DANGUN
      </text>
      
      {/* Connection lines representing network */}
      <line x1="12" y1="35" x2="25" y2="35" stroke="#00ff41" strokeWidth="1"/>
      <line x1="39" y1="35" x2="52" y2="35" stroke="#00ff41" strokeWidth="1"/>
      <line x1="25" y1="35" x2="32" y2="40" stroke="#00ff41" strokeWidth="1"/>
      <line x1="39" y1="35" x2="32" y2="40" stroke="#00ff41" strokeWidth="1"/>
      
      {/* MUD server indicator */}
      <circle cx="32" cy="42" r="3" fill="#00ff41" opacity="0.8"/>
      <text 
        x="32" 
        y="46" 
        textAnchor="middle" 
        fill="#00ff41" 
        fontSize="3" 
        fontFamily="monospace"
      >
        MUD
      </text>
      
      {/* Terminal cursor */}
      <rect 
        x="45" 
        y="50" 
        width="6" 
        height="2" 
        fill="#00ff41"
        opacity="0.8"
      >
        <animate 
          attributeName="opacity" 
          values="0.8;0.2;0.8" 
          dur="1.5s" 
          repeatCount="indefinite"
        />
      </rect>
      
      {/* Bottom border accent */}
      <rect 
        x="8" 
        y="52" 
        width="48" 
        height="2" 
        fill="#00ff41" 
        opacity="0.3"
      />
    </svg>
  );
};

export default Logo;
