import { motion } from 'framer-motion';
import { Download, Settings } from 'lucide-react';

interface HeroContentProps {
  onOpenPanel: () => void;
  onExport: () => void;
}

export const HeroContent = ({ onOpenPanel, onExport }: HeroContentProps) => {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="max-w-4xl"
      >
        <h1 className="tracking-tight mb-6">
          <div className="flex items-baseline justify-center gap-3">
            <span className="font-display text-2xl md:text-3xl lg:text-4xl font-semibold text-muted-foreground lowercase">
              amdocs
            </span>
            <span className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-gradient uppercase">
              AMBIANCE
            </span>
          </div>
          <div className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground lowercase">
            studio
          </div>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
        >
          <motion.button
            onClick={onOpenPanel}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-primary via-accent to-gradient-3 text-primary-foreground font-medium text-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings className="w-5 h-5" />
            Customize
          </motion.button>
          
          <motion.button
            onClick={onExport}
            className="px-8 py-4 rounded-full glass text-foreground font-medium text-lg hover:bg-secondary/50 transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-5 h-5" />
            Export
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};
