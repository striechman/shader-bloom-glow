import { motion } from 'framer-motion';

export const Footer = () => {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative z-10 py-12 px-6 border-t border-border"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary via-accent to-gradient-3" />
          <span className="font-display text-sm font-medium text-muted-foreground">
            ShaderGradient
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a
            href="https://github.com/ruucm/shadergradient"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/shadergradient"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            npm
          </a>
          <a
            href="https://twitter.com/ruucm"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Twitter
          </a>
        </div>

        <p className="text-xs text-muted-foreground">
          Made with ♥ by{' '}
          <a
            href="https://github.com/ruucm"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            ruucm
          </a>
        </p>
      </div>
    </motion.footer>
  );
};
