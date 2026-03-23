import React from 'react';
import { motion } from 'motion/react';

interface LoadingScreenProps {
  progress?: number;
  message?: string;
  logoUrl: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  progress = 0, 
  message = "Carregando...", 
  logoUrl 
}) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm"
    >
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Progress Circle */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="4"
            className="text-zinc-100"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="text-brand-blue"
            strokeLinecap="round"
          />
        </svg>

        {/* Logo Container */}
        <div className="w-32 h-32 rounded-full overflow-hidden bg-white border border-zinc-100 shadow-sm flex items-center justify-center p-4">
          <motion.img
            src={logoUrl}
            alt="Logo"
            className="w-full h-full object-contain"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Percentage and Message */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <motion.span 
          className="text-2xl font-bold text-brand-blue font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {Math.round(progress)}%
        </motion.span>
        <motion.p 
          className="text-zinc-500 font-medium"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      </div>
    </motion.div>
  );
};
