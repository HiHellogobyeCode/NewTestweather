import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import WeatherEffects from './WeatherEffects';
import { Cloud, Sun, CloudRain, Snowflake, AlertCircle, Search } from 'lucide-react';
import { useState } from 'react';

interface WeatherInfoProps {
  weather: any;
  isLoading: boolean;
  error: any;
  unit: string;
  onUnitChange: (unit: string) => void;
  onSearch: (query: string) => void;
}

export default function WeatherInfo({ 
  weather, 
  isLoading, 
  error,
  unit,
  onUnitChange,
  onSearch
}: WeatherInfoProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

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

      <Card className="p-6 bg-black/50 backdrop-blur-sm border-gray-800 max-w-xl mx-auto">
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <Input
            type="text"
            placeholder="Search location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-900/50 border-gray-700 text-gray-300 placeholder:text-gray-500"
          />
          <Button type="submit" variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex flex-col items-center space-y-6">
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

          <div className="grid grid-cols-2 gap-8 text-sm font-mono w-full max-w-xs">
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
    </>
  );
}