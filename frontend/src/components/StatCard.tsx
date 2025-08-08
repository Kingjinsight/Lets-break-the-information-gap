import React, { useRef, useEffect } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
  animateValue?: boolean;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  icon,
  className = '',
  animateValue = false,
  delay = 0
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // The animation logic here was based on a different animation system.
    // It's being removed to fix build errors. The parent component (Dashboard.tsx)
    // now handles animations using Framer Motion.
  }, [value, animateValue, delay]);

  return (
    <div 
      ref={cardRef}
      className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transform-gpu transition-all duration-200 ${className}`}
    >
      <div className="flex items-center">
        {icon && (
          <div className="mr-4 text-blue-600 dark:text-blue-400">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p 
            ref={valueRef}
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            {animateValue && typeof value === 'number' ? '0' : value}
          </p>
          {typeof change === 'number' && (
            <div className={`flex items-center mt-1 text-sm ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <span className="mr-1">
                {change >= 0 ? '↗' : '↘'}
              </span>
              <span>
                {Math.abs(change)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
