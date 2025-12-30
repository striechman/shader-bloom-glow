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
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-sm uppercase letter-spacing-wide text-muted-foreground mb-6"
        >
          Gradient Generator for Print & Web
        </motion.p>
        
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
          <span className="text-gradient">Create</span>
          <br />
          <span className="text-foreground">Gradients</span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          Design stunning 3D animated gradients for your projects. 
          Export in high resolution for print or web use.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-xs uppercase letter-spacing-wide">Click customize to start</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
