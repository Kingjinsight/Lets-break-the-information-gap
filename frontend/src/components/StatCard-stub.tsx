import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  icon,
  className = '' 
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm ${className}`}>
      <div className="flex items-center">
        {icon && (
          <div className="mr-4 text-blue-600">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {typeof change === 'number' && (
            <p className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
