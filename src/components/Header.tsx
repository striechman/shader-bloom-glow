import { motion } from 'framer-motion';
import { Menu, Undo2, Redo2 } from 'lucide-react';

interface HeaderProps {
  onMenuToggle: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const Header = ({ onMenuToggle, onUndo, onRedo, canUndo = false, canRedo = false }: HeaderProps) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="fixed top-0 left-0 right-0 z-30 p-4 md:p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Liquid Glass Logo */}
          <motion.div
            className="relative w-8 h-8 md:w-10 md:h-10 rounded-xl overflow-hidden"
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
          <div className="font-display text-sm md:text-lg font-semibold tracking-tight text-foreground lowercase hidden sm:block">
            amdocs ambiance studio
          </div>
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo Buttons */}
          {onUndo && onRedo && (
            <div className="flex items-center gap-1">
              <motion.button
                onClick={onUndo}
                disabled={!canUndo}
                className={`glass rounded-full p-2.5 md:p-3 transition-colors ${
                  canUndo 
                    ? 'hover:bg-secondary/50 text-foreground' 
                    : 'opacity-40 cursor-not-allowed text-muted-foreground'
                }`}
                whileHover={canUndo ? { scale: 1.05 } : {}}
                whileTap={canUndo ? { scale: 0.95 } : {}}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </motion.button>
              <motion.button
                onClick={onRedo}
                disabled={!canRedo}
                className={`glass rounded-full p-2.5 md:p-3 transition-colors ${
                  canRedo 
                    ? 'hover:bg-secondary/50 text-foreground' 
                    : 'opacity-40 cursor-not-allowed text-muted-foreground'
                }`}
                whileHover={canRedo ? { scale: 1.05 } : {}}
                whileTap={canRedo ? { scale: 0.95 } : {}}
                aria-label="Redo"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
              </motion.button>
            </div>
          )}
          
          {/* Hamburger Menu Button */}
          <motion.button
            onClick={onMenuToggle}
            className="glass rounded-full p-3 md:p-4 hover:bg-secondary/50 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};
