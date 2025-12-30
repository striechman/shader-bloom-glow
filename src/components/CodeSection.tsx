import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

const codeExample = `import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'

function App() {
  return (
    <ShaderGradientCanvas>
      <ShaderGradient
        type="sphere"
        animate="on"
        uSpeed={0.4}
        color1="#ff5005"
        color2="#dbba95"
        color3="#d0bce1"
      />
    </ShaderGradientCanvas>
  )
}`;

export const CodeSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeExample);
    setCopied(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section ref={ref} className="relative z-10 py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Easy to Use
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Just a few lines of code to get started
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-gradient-3/60" />
                <div className="w-3 h-3 rounded-full bg-accent/60" />
              </div>
              <span className="text-xs text-muted-foreground font-mono">App.tsx</span>
              <button
                onClick={handleCopy}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-6 overflow-x-auto text-sm">
              <code className="text-muted-foreground">
                {codeExample.split('\n').map((line, i) => (
                  <div key={i} className="leading-relaxed">
                    <span className="text-muted-foreground/50 select-none mr-4 w-6 inline-block text-right">
                      {i + 1}
                    </span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: highlightCode(line),
                      }}
                    />
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-muted-foreground mb-4">Install via npm</p>
          <code className="glass px-6 py-3 rounded-full text-sm font-mono text-foreground">
            npm install @shadergradient/react three @react-three/fiber
          </code>
        </motion.div>
      </div>
    </section>
  );
};

function highlightCode(line: string): string {
  return line
    .replace(/(import|from|function|return)/g, '<span class="text-primary">$1</span>')
    .replace(/(".*?")/g, '<span class="text-accent">$1</span>')
    .replace(/(&lt;.*?&gt;|<[A-Z][a-zA-Z]*|<\/[A-Z][a-zA-Z]*>)/g, '<span class="text-gradient-3">$1</span>')
    .replace(/(ShaderGradientCanvas|ShaderGradient|App)/g, '<span class="text-gradient-1">$1</span>')
    .replace(/(\{|\})/g, '<span class="text-muted-foreground">$1</span>');
}
