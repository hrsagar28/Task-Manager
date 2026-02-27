import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, className = '', onClick, style
}) => (
  <div 
    className={`volumetric-surface glass-noise rounded-[24px] p-6 md:p-8 transition-all duration-500 ease-smooth ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_0.5px_0_0_rgba(255,255,255,0.9)_inset,0_-0.5px_0_0_rgba(255,255,255,0.15)_inset,0_20px_48px_-16px_rgba(0,0,0,0.1),0_4px_12px_-4px_rgba(0,0,0,0.05)]' : ''} ${className}`}
    onClick={onClick}
    style={style}
  >
    {children}
  </div>
);