import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const AnimatedSection = ({
  children,
  className = '',
  delay = 0,
  direction = 'up' // 'up', 'down', 'left', 'right', 'none'
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { isRtl } = useLanguage();

  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { opacity: 0, y: 60 };
      case 'down': return { opacity: 0, y: -60 };
      // Flip horizontal directions for RTL
      case 'left': return { opacity: 0, x: isRtl ? -60 : 60 };
      case 'right': return { opacity: 0, x: isRtl ? 60 : -60 };
      default: return { opacity: 0 };
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={getInitialPosition()}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : getInitialPosition()}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedSection;
