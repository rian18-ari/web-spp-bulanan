import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useApp();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none no-print">
      {notifications.map((notif) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
          error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
          info: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
        };

        const bgBorders = {
          success: 'bg-white border-emerald-200 text-neutral-900',
          error: 'bg-white border-rose-200 text-neutral-900',
          warning: 'bg-white border-amber-200 text-neutral-900',
          info: 'bg-white border-blue-200 text-neutral-900',
        };

        return (
          <div
            key={notif.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all ${
              bgBorders[notif.type]
            }`}
          >
            {icons[notif.type]}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-neutral-900">{notif.title}</h4>
              <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{notif.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notif.id)}
              className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
