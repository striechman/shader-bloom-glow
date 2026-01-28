import { motion } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';

export const Header = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="fixed top-0 left-0 right-0 z-30 p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Liquid Glass Logo */}
          <motion.div
            className="relative w-10 h-10 rounded-xl overflow-hidden"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            {/* Glass background */}
            <div className="absolute inset-0 bg-foreground/10 backdrop-blur-xl" />
            {/* Border glow */}
            <div className="absolute inset-0 rounded-xl border border-foreground/20" />
            {/* Inner highlight */}
            <div className="absolute inset-[1px] rounded-xl bg-gradient-to-br from-foreground/15 via-transparent to-foreground/5" />
            {/* Subtle shine */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-foreground/10 to-transparent rounded-t-xl" />
          </motion.div>
          <div className="font-display text-lg font-semibold tracking-tight text-foreground lowercase">
            amdocs ambiance studio
          </div>
        </div>
        
        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </motion.header>
  );
};
