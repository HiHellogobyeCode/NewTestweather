import { useEffect, useState } from 'react';
import DotMatrixDisplay from '@/components/DotMatrixDisplay';
import WeatherInfo from '@/components/WeatherInfo';
import { useWeather } from '@/hooks/useWeather';
import { useToast } from '@/hooks/use-toast';

interface Location {
  lat: number;
  lon: number;
}

export default function Home() {
  const { toast } = useToast();
  const [unit, setUnit] = useState(() => localStorage.getItem('unit') || 'F');
  const [location, setLocation] = useState<Location | null>(null);

  const { data: weather, isLoading, error } = useWeather(location?.lat, location?.lon);

  const handleSearch = async (query: string) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'User-Agent': 'DotMatrixWeather/1.0' } }
      );
      const data = await res.json();

      if (data[0]) {
        setLocation({
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        });
      } else {
        toast({
          title: "Location Not Found",
          description: "Please try a different search term",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Search Error",
        description: "Failed to search location",
        variant: "destructive"
      });
    }
  };

  const handleLocationSelect = (lat: number, lon: number) => {
    setLocation({ lat, lon });
  };

  useEffect(() => {
    const getLocation = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
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

  useEffect(() => {
    localStorage.setItem('unit', unit);
  }, [unit]);

  return (
    <div className="min-h-screen bg-black text-gray-300 relative overflow-hidden">
      <DotMatrixDisplay />

      <div className="relative z-10 container mx-auto px-4 py-12">
        <WeatherInfo 
          weather={weather}
          isLoading={isLoading}
          error={error}
          unit={unit}
          onUnitChange={setUnit}
          onSearch={handleSearch}
          onLocationSelect={handleLocationSelect}
          location={location}
        />
      </div>
    </div>
  );
}