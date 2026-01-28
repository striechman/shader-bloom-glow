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
          <div className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground lowercase">
            amdocs ambiance studio
          </div>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
        >
          {/* Liquid Glass Customize Button */}
          <motion.button
            onClick={onOpenPanel}
            className="group relative px-8 py-4 rounded-full font-medium text-lg flex items-center gap-2 overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Glass background */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-xl rounded-full" />
            {/* Border */}
            <div className="absolute inset-0 rounded-full border border-white/20" />
            {/* Top highlight */}
            <div className="absolute inset-[1px] rounded-full bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
            {/* Hover glow */}
            <div className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Content */}
            <Settings className="w-5 h-5 relative z-10 text-foreground" />
            <span className="relative z-10 text-foreground lowercase">customize</span>
          </motion.button>
          
          {/* Liquid Glass Export Button */}
          <motion.button
            onClick={onExport}
            className="group relative px-8 py-4 rounded-full font-medium text-lg flex items-center gap-2 overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Glass background - slightly darker */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-xl rounded-full" />
            {/* Border */}
            <div className="absolute inset-0 rounded-full border border-white/10" />
            {/* Top highlight */}
            <div className="absolute inset-[1px] rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            {/* Hover glow */}
            <div className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Content */}
            <Download className="w-5 h-5 relative z-10 text-foreground" />
            <span className="relative z-10 text-foreground lowercase">export</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};
