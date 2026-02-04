import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SOSAlertNotification {
  id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  created_at: string;
  notes?: string;
}

export function SOSAlertNotificationListener() {
  const [notification, setNotification] = useState<SOSAlertNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel('sos_alerts_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sos_alerts' },
        (payload) => {
          const newAlert = payload.new as SOSAlertNotification;
          console.log('🚨 NEW SOS ALERT RECEIVED:', newAlert);

          // Play sound
          playAlertSound();

          // Show notification popup
          setNotification(newAlert);
          setIsVisible(true);

          // Show toast
          toast({
            title: '🚨 EMERGENCY SOS ALERT',
            description: `New SOS alert from driver at ${new Date(newAlert.created_at).toLocaleTimeString()}`,
            variant: 'destructive',
          });

          // Auto-hide after 10 seconds
          setTimeout(() => {
            setIsVisible(false);
          }, 10000);
        }
      )
      .subscribe((status) => {
        console.log('SOS Realtime subscription status:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [toast]);

  const playAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  if (!isVisible || !notification) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src="/sos-43210.mp3"
        preload="auto"
      />

      {/* Notification Popup */}
      <div
        className={cn(
          'fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-2 duration-300',
          'bg-red-50 border-2 border-red-500 rounded-lg shadow-2xl p-4'
        )}
      >
        <div className="flex gap-4">
          {/* Alert Icon */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 animate-pulse">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-900">
              🚨 EMERGENCY SOS ALERT
            </h3>
            <p className="text-sm text-red-700 mt-1">
              New emergency alert received from driver
            </p>
            <p className="text-xs text-red-600 mt-2">
              Time: {new Date(notification.created_at).toLocaleString()}
            </p>
            {notification.notes && (
              <p className="text-sm text-red-700 mt-2 font-semibold">
                Notes: {notification.notes}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${notification.latitude},${notification.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-red-600 hover:text-red-700 underline"
              >
                View Location →
              </a>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 text-red-400 hover:text-red-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1 bg-red-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-600 animate-pulse"
            style={{
              animation: 'shrink 10s linear forwards',
            }}
          />
        </div>

        <style>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    </>
  );
}
