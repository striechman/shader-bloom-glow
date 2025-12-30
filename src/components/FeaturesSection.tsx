import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const features = [
  {
    title: 'React Component',
    description: 'Drop-in React component that works seamlessly with your existing project.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 9.861A2.139 2.139 0 1 0 12 14.139 2.139 2.139 0 1 0 12 9.861zM6.008 16.255l-.472-.12C2.018 15.246 0 13.737 0 11.996s2.018-3.25 5.536-4.139l.472-.119.133.468a23.53 23.53 0 0 0 1.363 3.578l.101.213-.101.213a23.307 23.307 0 0 0-1.363 3.578l-.133.467zM5.317 8.95c-2.674.751-4.315 1.9-4.315 3.046 0 1.145 1.641 2.294 4.315 3.046a24.95 24.95 0 0 1 1.182-3.046A24.752 24.752 0 0 1 5.317 8.95zM17.992 16.255l-.133-.469a23.357 23.357 0 0 0-1.364-3.577l-.101-.213.101-.213a23.42 23.42 0 0 0 1.364-3.578l.133-.468.473.119c3.517.889 5.535 2.398 5.535 4.14s-2.018 3.25-5.535 4.139l-.473.12zm-.491-4.259c.48 1.039.877 2.06 1.182 3.046 2.675-.752 4.315-1.901 4.315-3.046 0-1.146-1.641-2.294-4.315-3.046a24.788 24.788 0 0 1-1.182 3.046z" />
        <path d="M5.31 8.951l-.133-.468C4.188 4.992 4.488 2.494 6 1.622c1.483-.856 3.864.155 6.359 2.716l.34.349-.34.349a23.552 23.552 0 0 0-2.422 2.967l-.135.193-.235.02a23.657 23.657 0 0 0-3.785.61l-.472.119zm1.896-6.63c-.268 0-.505.058-.705.173-.994.573-1.17 2.565-.485 5.253a25.122 25.122 0 0 1 3.233-.501 24.847 24.847 0 0 1 2.052-2.544c-1.56-1.519-3.037-2.381-4.095-2.381zM18.69 8.951l-.472-.119a23.479 23.479 0 0 0-3.787-.61l-.234-.02-.135-.193a23.414 23.414 0 0 0-2.421-2.967l-.34-.349.34-.349C14.135 1.778 16.515.767 18 1.622c1.512.872 1.812 3.37.824 6.861l-.134.468zM14.75 7.24c1.142.104 2.227.273 3.234.501.685-2.688.509-4.68-.485-5.253-.988-.571-2.845.304-4.8 2.208A24.849 24.849 0 0 1 14.75 7.24z" />
        <path d="M18.69 15.044l-.133.468c-.989 3.491-1.289 5.989-2.824 6.861-1.483.856-3.864-.155-6.359-2.716l-.34-.349.34-.349a23.54 23.54 0 0 0 2.422-2.967l.135-.193.235-.02a23.42 23.42 0 0 0 3.785-.61l.472-.12.267.995zm-5.439 3.707c1.56 1.519 3.037 2.381 4.095 2.381.268 0 .505-.058.705-.173.994-.573 1.17-2.565.485-5.254a25.02 25.02 0 0 1-3.234.501 24.674 24.674 0 0 1-2.051 2.545zM5.31 15.044l.472-.12a23.642 23.642 0 0 0 3.786-.609l.234-.02.135-.193a23.553 23.553 0 0 0 2.422-2.968l.34-.349-.34-.349c-2.494-2.561-4.875-3.571-6.359-2.716-1.512.872-1.812 3.37-.824 6.861l.134.463zm4.629-2.799a25.035 25.035 0 0 1-3.233-.5c-.686 2.688-.51 4.68.484 5.253.988.571 2.846-.304 4.8-2.208a24.648 24.648 0 0 1-2.051-2.545z" />
        <path d="M12 18.503c-.914 0-1.798-.07-2.643-.2l-.235-.034-.135-.191a23.476 23.476 0 0 1-2.421-2.967l-.34-.349.34-.349a23.585 23.585 0 0 1 2.421-2.967l.135-.191.235-.034c1.689-.258 3.401-.258 5.09 0l.234.034.135.191a23.511 23.511 0 0 1 2.421 2.967l.34.349-.34.349a23.476 23.476 0 0 1-2.421 2.967l-.135.191-.234.034c-.845.13-1.73.2-2.647.2zm-1.957-1.193c1.278.133 2.636.133 3.914 0a24.733 24.733 0 0 0 2.052-2.544 24.922 24.922 0 0 0-2.052-2.544 25.03 25.03 0 0 0-3.914 0 24.817 24.817 0 0 0-2.051 2.544 24.817 24.817 0 0 0 2.051 2.544z" />
      </svg>
    ),
  },
  {
    title: '3D Shapes',
    description: 'Choose from sphere, plane, or water-like surfaces for your gradient.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <ellipse cx="12" cy="12" rx="10" ry="4" />
        <path d="M12 2v20" />
      </svg>
    ),
  },
  {
    title: 'Animated',
    description: 'Smooth, performant animations that bring your gradients to life.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    title: 'Customizable',
    description: 'Fine-tune colors, speed, grain, and shader effects to match your vision.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
];

export const FeaturesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="relative z-10 py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Features
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to create stunning gradient backgrounds
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass p-6 rounded-2xl hover:bg-secondary/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 text-primary group-hover:from-primary/30 group-hover:to-accent/30 transition-colors">
                {feature.icon}
              </div>
              <h3 className="font-display text-lg font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
