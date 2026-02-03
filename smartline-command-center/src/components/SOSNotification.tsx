import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Siren, MapPin, User, ArrowRight, X } from 'lucide-react';

interface SOSAlertData {
  id: string;
  trip_id: string;
  reporter_id?: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  metadata?: any;
}

export function SOSNotification() {
  const [alert, setAlert] = useState<SOSAlertData | null>(null);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('/sos-43210.mp3');
    audioRef.current.loop = true;

    const channel = supabase
      .channel('sos_alerts_global')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'sos_alerts' }, 
        (payload) => {
          const newAlert = payload.new as SOSAlertData;
          if (newAlert.status === 'pending') {
            setAlert(newAlert);
            setShow(true);
            // Play sound
            audioRef.current?.play().catch(console.error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      audioRef.current?.pause();
    };
  }, []);

  const handleClose = () => {
    setShow(false);
    audioRef.current?.pause();
    audioRef.current!.currentTime = 0;
  };

  const handleNavigate = () => {
    handleClose();
    navigate('/safety');
  };

  if (!show || !alert) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md mx-4 border-red-500 border-2 shadow-2xl animate-in zoom-in-95 duration-300">
        <CardHeader className="bg-red-50 border-b border-red-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Siren className="h-8 w-8 text-red-600 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
              <div>
                <CardTitle className="text-red-700 text-xl">EMERGENCY SOS!</CardTitle>
                <Badge variant="destructive" className="mt-1">NEW ALERT</Badge>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              className="text-red-400 hover:text-red-600 hover:bg-red-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-gray-700">
            <User className="h-5 w-5 text-gray-500" />
            <span className="font-medium">Emergency assistance requested</span>
          </div>
          
          <div className="flex items-start gap-3 text-gray-700">
            <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="font-medium">Location:</p>
              <p className="text-sm font-mono text-gray-600">
                {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Received: {new Date(alert.created_at).toLocaleString()}
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Dismiss
            </Button>
            <Button 
              onClick={handleNavigate}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Go to Safety
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
