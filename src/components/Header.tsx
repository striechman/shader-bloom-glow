import { motion } from 'framer-motion';

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
          <motion.div
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary via-accent to-gradient-3"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">
            Gradient Studio
          </span>
        </div>
        <p className="hidden md:block text-sm text-muted-foreground">
          Create • Customize • Export
        </p>
      </div>
    </motion.header>
  );
};
