import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import WeatherEffects from './WeatherEffects';
import LocationSearch from './LocationSearch';
import WeatherMap from './WeatherMap';
import { Cloud, Sun, CloudRain, Snowflake, AlertCircle, Moon } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
      <Card className="p-6 bg-black/30 border-red-500 backdrop-blur-lg">
        <div className="flex items-center justify-center gap-2">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <p className="text-red-500">Failed to load weather data</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6 bg-black/30 backdrop-blur-lg border-gray-800/50">
        <div className="space-y-4">
          <Skeleton className="h-12 w-48 bg-gray-800/50" />
          <Skeleton className="h-24 w-32 bg-gray-800/50" />
          <Skeleton className="h-8 w-24 bg-gray-800/50" />
        </div>
      </Card>
    );
  }

  if (!weather) return null;

  const temp = unit === 'C' ? 
    Math.round((weather.current.temp - 32) * 5/9) : 
    Math.round(weather.current.temp);

  const isNight = new Date().getHours() >= 18 || new Date().getHours() < 6;
  const WeatherIcon = {
    'Clear': isNight ? Moon : Sun,
    'Clouds': Cloud,
    'Rain': CloudRain,
    'Snow': Snowflake
  }[weather.current.condition] || (isNight ? Moon : Sun);

  const formatTemp = (temp: number) => {
    return unit === 'C' ? Math.round((temp - 32) * 5/9) : Math.round(temp);
  };

  return (
    <>
      <WeatherEffects condition={weather.current.condition} />

      <div className="space-y-6 w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-black/30 backdrop-blur-lg border-gray-800/50 hover:bg-black/40 transition-colors">
            <LocationSearch onSearch={onSearch} onLocationSelect={onLocationSelect} />

            <div className="flex flex-col items-center space-y-6 mt-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-mono tracking-wider text-glow-subtle">
                  {weather.location}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUnitChange(unit === 'C' ? 'F' : 'C')}
                  className="font-mono border-gray-700/50 hover:bg-gray-800/30 backdrop-blur-sm"
                >
                  °{unit}
                </Button>
              </div>

              <div className="flex items-center gap-6">
                <WeatherIcon className="h-16 w-16 text-glow-subtle" />
                <div className="text-7xl font-mono tracking-widest text-glow-subtle">
                  {temp}°
                </div>
              </div>

              <div className="font-mono tracking-wide uppercase text-glow-subtle">
                {weather.current.condition}
              </div>

              <div className="grid grid-cols-2 gap-8 text-sm font-mono w-full">
                <div className="bg-gray-900/20 backdrop-blur-md p-4 rounded border border-gray-800/30">
                  <div className="text-gray-500 mb-1">HUMIDITY</div>
                  <div className="text-glow-subtle">{weather.current.humidity}%</div>
                </div>
                <div className="bg-gray-900/20 backdrop-blur-md p-4 rounded border border-gray-800/30">
                  <div className="text-gray-500 mb-1">WIND</div>
                  <div className="text-glow-subtle">{weather.current.windSpeed} MPH</div>
                </div>
              </div>

              {/* 24-hour forecast */}
              <div className="w-full mt-4">
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex space-x-4">
                    {weather.hourly.slice(0, 24).map((hour: any, i: number) => {
                      const hourIsNight = new Date(hour.time).getHours() >= 18 || new Date(hour.time).getHours() < 6;
                      const Icon = {
                        'Clear': hourIsNight ? Moon : Sun,
                        'Clouds': Cloud,
                        'Rain': CloudRain,
                        'Snow': Snowflake
                      }[hour.condition] || (hourIsNight ? Moon : Sun);
                      const time = new Date(hour.time);

                      return (
                        <div 
                          key={i}
                          className="flex-none w-16 bg-gray-900/20 backdrop-blur-md p-2 rounded border border-gray-800/30 text-center"
                        >
                          <span className="text-xs text-gray-500 font-mono block">
                            {format(time, 'HH:mm')}
                          </span>
                          <Icon className="h-4 w-4 text-glow-subtle mx-auto my-2" />
                          <span className="text-xs font-mono text-glow-subtle block">
                            {formatTemp(hour.temp)}°
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </div>
          </Card>

          {location && <WeatherMap lat={location.lat} lon={location.lon} weather={weather} />}
        </div>

        {/* 7-day forecast */}
        {weather.daily && (
          <Card className="p-4 bg-black/30 backdrop-blur-lg border-gray-800/50">
            <h2 className="text-lg font-mono mb-4 text-glow-subtle">7-DAY FORECAST</h2>
            <div className="grid gap-2">
              {weather.daily.map((day: any, i: number) => {
                const Icon = {
                  'Clear': Sun,
                  'Clouds': Cloud,
                  'Rain': CloudRain,
                  'Snow': Snowflake
                }[day.condition] || Sun;
                const date = new Date(day.date);

                return (
                  <div 
                    key={i}
                    className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center bg-gray-900/20 backdrop-blur-md p-3 rounded border border-gray-800/30"
                  >
                    <div className="font-mono text-sm">
                      {i === 0 ? 'Today' : format(date, 'EEE')}
                    </div>
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-glow-subtle" />
                      {day.precipProb > 30 && (
                        <span className="text-xs font-mono text-blue-400/80">
                          {day.precipProb}%
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm text-right">
                      <span className="text-glow-subtle">{formatTemp(day.maxTemp)}°</span>
                      <span className="text-gray-500 ml-2">{formatTemp(day.minTemp)}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}