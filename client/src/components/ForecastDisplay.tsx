import { Card } from '@/components/ui/card';
import { Cloud, Sun, CloudRain, Snowflake } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ForecastProps {
  hourlyData: Array<{
    time: string;
    temp: number;
    condition: string;
  }>;
  unit: string;
}

export default function ForecastDisplay({ hourlyData, unit }: ForecastProps) {
  const WeatherIcon = {
    'Clear': Sun,
    'Clouds': Cloud,
    'Rain': CloudRain,
    'Snow': Snowflake
  };

  const formatTemp = (temp: number) => {
    return unit === 'C' ? Math.round((temp - 32) * 5/9) : Math.round(temp);
  };

  return (
    <Card className="p-4 bg-black/50 backdrop-blur-sm border-gray-800">
      <h2 className="text-lg font-mono mb-4 text-glow text-center">24-HOUR FORECAST</h2>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-4">
          {hourlyData.slice(0, 24).map((hour, i) => {
            const Icon = WeatherIcon[hour.condition as keyof typeof WeatherIcon] || Sun;
            const time = new Date(hour.time);

            return (
              <div 
                key={i}
                className="flex-none w-20 bg-gray-900/30 p-3 rounded border border-gray-800 text-center"
              >
                <span className="text-xs text-gray-500 font-mono block">
                  {format(time, 'HH:mm')}
                </span>
                <Icon className="h-6 w-6 text-glow mx-auto my-2" />
                <span className="text-sm font-mono text-glow block">
                  {formatTemp(hour.temp)}°
                </span>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}