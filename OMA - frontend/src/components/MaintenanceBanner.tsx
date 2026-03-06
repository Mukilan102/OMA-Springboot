import React from 'react';
import { AlertCircle } from 'lucide-react';

interface MaintenanceBannerProps {
  visible: boolean;
  estimatedMinutes?: number;
}

export const MaintenanceBanner: React.FC<MaintenanceBannerProps> = ({ 
  visible, 
  estimatedMinutes = 30 
}) => {
  if (!visible) return null;

  return (
    <div className="w-full bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-800">System Maintenance</h3>
          <p className="text-sm text-yellow-700 mt-1">
            We're currently performing scheduled maintenance to improve our services.
          </p>
          <p className="text-xs text-yellow-600 mt-2">
            Estimated downtime: {estimatedMinutes} minutes. Thank you for your patience!
          </p>
        </div>
      </div>
    </div>
  );
};
