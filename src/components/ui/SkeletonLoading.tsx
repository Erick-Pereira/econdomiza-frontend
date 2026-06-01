import { forwardRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface SkeletonLoadingProps {
  shape?: 'rect' | 'circle';
  size?: 'sm' | 'md' | 'lg' | 'full' | 'none';
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  animated?: boolean;
  duration?: number;
}

const SIZE_STYLES: Record<string, string> = {
  none: 'h-auto min-h-0',
  sm: 'h-3.5',
  md: 'h-12',
  lg: 'h-16',
  full: 'h-full',
};

const WIDTH_STYLES: Record<string, string> = {
  none: 'w-auto',
  sm: 'w-[140px]',
  md: 'w-[280px]',
  lg: 'w-full',
  full: 'w-full',
};

function AnimatedSkeletonWrapper({
  className = '',
  shape = 'rect',
}: {
  className?: string;
  shape?: 'rect' | 'circle';
}) {
  return (
    <motion.div
      key="skeleton"
      className={className}
      animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
      style={{
        backgroundColor: '#f9fafb',
        borderRadius: shape === 'circle' ? '9999px' : '6px',
        overflow: 'hidden',
      }}
    />
  );
}

export const SkeletonLoading = forwardRef<HTMLDivElement, SkeletonLoadingProps>(
  (
    { shape = 'rect', size = 'md', children, className, style, animated = true, duration = 2000, ...props },
    ref
  ) => {
    if (!children) {
      if (animated) {
        return (
          <motion.div
            ref={ref}
            className={`skeleton ${shape === 'circle' ? 'rounded-full' : ''} ${className}`}
            style={{ ...style, height: SIZE_STYLES[size], width: WIDTH_STYLES[size] }}
            animate={{ opacity: [0.5, 1, 0.5] }}
          />
        );
      }
      return (
        <div
          ref={ref}
          className={`skeleton ${shape === 'circle' ? 'rounded-full' : ''} ${className}`}
          style={{ ...style, height: SIZE_STYLES[size], width: WIDTH_STYLES[size] }}
          {...props}
        />
      );
    }

    return (
      <div ref={ref} className="relative h-full" {...props}>
        <AnimatedSkeletonWrapper shape={shape} className="absolute inset-0 pointer-events-none z-0" />
        <div className="relative z-10 h-full">{children}</div>
      </div>
    );
  }
);

SkeletonLoading.displayName = 'SkeletonLoading';
