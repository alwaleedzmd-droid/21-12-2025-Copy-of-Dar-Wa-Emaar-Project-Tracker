// BentoCard.tsx — Glassmorphism Bento Grid Card
import React from 'react';
import { motion } from 'framer-motion';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  span?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  glow?: boolean;
  pulse?: 'red' | 'green' | null;
  onClick?: () => void;
  delay?: number;
}

const spanMap: Record<string, string> = {
  sm: 'col-span-1 row-span-1',
  md: 'col-span-1 row-span-2 md:col-span-2 md:row-span-1',
  lg: 'col-span-1 row-span-1 md:col-span-2 md:row-span-2',
  xl: 'col-span-1 row-span-1 md:col-span-3 md:row-span-2',
  full: 'col-span-full row-span-1',
};

const BentoCard: React.FC<BentoCardProps> = ({ 
  children, className = '', span = 'sm', glow = false, pulse, onClick, delay = 0 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: 'spring', 
        stiffness: 200, 
        damping: 25, 
        delay: delay * 0.1 
      }}
      whileHover={{ scale: 1.01 }}
      className={`
        glass-card p-6
        ${glow ? 'glow-border' : ''}
        ${pulse === 'red' ? 'pulse-red' : ''}
        ${pulse === 'green' ? 'pulse-green' : ''}
        ${spanMap[span] || spanMap.sm}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

export default BentoCard;
