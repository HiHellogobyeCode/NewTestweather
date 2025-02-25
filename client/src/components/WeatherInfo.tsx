import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import WeatherEffects from './WeatherEffects';
import LocationSearch from './LocationSearch';
import ForecastDisplay from './ForecastDisplay';
import WeatherMap from './WeatherMap';
import { Cloud, Sun, CloudRain, Snowflake, AlertCircle } from 'lucide-react';

interface WeatherInfoProps {
  weather: any;
  isLoading: boolean;
  error: any;
  unit: string;
  onUnitChange: (unit: string) => void;
  onSearch: (query: string) => void;
  onLocationSelect: (lat: number, lon: number) => void;
  location: { lat: number; lon: number } | null;
}

export default function WeatherInfo({ 
  weather, 
  isLoading, 
  error,
  unit,
  onUnitChange,
  onSearch,
  onLocationSelect,
  location
}: WeatherInfoProps) {
  if (error) {
    return (
      <Card className="p-6 bg-black/50 border-red-500">
        <div className="flex items-center justify-center gap-2">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <p className="text-red-500">Failed to load weather data</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6 bg-black/50">
        <div className="space-y-4">
          <Skeleton className="h-12 w-48 bg-gray-800" />
          <Skeleton className="h-24 w-32 bg-gray-800" />
          <Skeleton className="h-8 w-24 bg-gray-800" />
        </div>
      </Card>
    );
  }

  if (!weather) return null;

  const temp = unit === 'C' ? 
    Math.round((weather.current.temp - 32) * 5/9) : 
    Math.round(weather.current.temp);

  const WeatherIcon = {
    'Clear': Sun,
    'Clouds': Cloud,
    'Rain': CloudRain,
    'Snow': Snowflake
  }[weather.current.condition] || Sun;

  return (
    <>
      <WeatherEffects condition={weather.current.condition} />

      <div className="space-y-6 w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-black/50 backdrop-blur-sm border-gray-800">
            <LocationSearch onSearch={onSearch} onLocationSelect={onLocationSelect} />

            <div className="flex flex-col items-center space-y-6 mt-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-mono tracking-wider text-glow">
                  {weather.location}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUnitChange(unit === 'C' ? 'F' : 'C')}
                  className="font-mono border-gray-700 hover:bg-gray-800"
                >
                  °{unit}
                </Button>
              </div>

              <div className="flex items-center gap-6">
                <WeatherIcon className="h-16 w-16 text-glow" />
                <div className="text-7xl font-mono tracking-widest text-glow">
                  {temp}°
                </div>
              </div>

              <div className="font-mono tracking-wide uppercase text-glow">
                {weather.current.condition}
              </div>

              <div className="grid grid-cols-2 gap-8 text-sm font-mono w-full">
                <div className="bg-gray-900/30 p-4 rounded border border-gray-800">
                  <div className="text-gray-500 mb-1">HUMIDITY</div>
                  <div className="text-glow">{weather.current.humidity}%</div>
                </div>
                <div className="bg-gray-900/30 p-4 rounded border border-gray-800">
                  <div className="text-gray-500 mb-1">WIND</div>
                  <div className="text-glow">{weather.current.windSpeed} MPH</div>
                </div>
              </div>
            </div>
          </Card>

          {location && <WeatherMap lat={location.lat} lon={location.lon} />}
        </div>

        {weather.hourly && (
          <ForecastDisplay hourlyData={weather.hourly} unit={unit} />
        )}
      </div>
    </>
  );
}