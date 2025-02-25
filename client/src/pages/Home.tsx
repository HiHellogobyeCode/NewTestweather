import { useEffect, useState } from 'react';
import DotMatrixDisplay from '@/components/DotMatrixDisplay';
import WeatherInfo from '@/components/WeatherInfo';
import { useWeather } from '@/hooks/useWeather';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { toast } = useToast();
  const [unit, setUnit] = useState(() => localStorage.getItem('unit') || 'F');
  const [location, setLocation] = useState(null);
  
  const { data: weather, isLoading, error } = useWeather(location?.lat, location?.lon);

  useEffect(() => {
    const getLocation = async () => {
      try {
        // Try getting user location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              setLocation({
                lat: pos.coords.latitude,
                lon: pos.coords.longitude
              });
            },
            async () => {
              // Fallback to IP location
              const res = await fetch('https://ipapi.co/json/');
              const data = await res.json();
              if (data.latitude && data.longitude) {
                setLocation({
                  lat: data.latitude,
                  lon: data.longitude
                });
              }
            }
          );
        }
      } catch (err) {
        toast({
          title: "Location Error",
          description: "Failed to get location",
          variant: "destructive"
        });
      }
    };

    getLocation();
  }, []);

  // Save unit preference
  useEffect(() => {
    localStorage.setItem('unit', unit);
  }, [unit]);

  return (
    <div className="min-h-screen bg-black text-gray-300 relative overflow-hidden">
      <DotMatrixDisplay />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <WeatherInfo 
          weather={weather}
          isLoading={isLoading}
          error={error}
          unit={unit}
          onUnitChange={setUnit}
        />
      </div>
    </div>
  );
}
