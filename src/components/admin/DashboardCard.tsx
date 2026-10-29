import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

export function DashboardCard({ title, value, description, icon, loading }: DashboardCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-100 dark:border-gray-700">
      <div className="p-5">
        <div className="flex items-center">
          {icon && (
            <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-md p-3 text-blue-600 dark:text-blue-300">
              {icon}
            </div>
          )}
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd>
                {loading ? (
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-1 animate-pulse"></div>
                ) : (
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {value}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {description && (
        <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-3 border-t border-gray-100 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </div>
        </div>
      )}
    </div>
  );
}
