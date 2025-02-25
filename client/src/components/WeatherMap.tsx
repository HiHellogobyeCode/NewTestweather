import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface WeatherMapProps {
  weather: any;
  location: { lat: number; lon: number } | null;
}

export default function WeatherMap({ weather, location }: WeatherMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState('temp');
  const [districts, setDistricts] = useState<any[]>([]);

  // Generate random districts based on weather data
  useEffect(() => {
    if (!weather || !location) return;

    const generateDistricts = () => {
      const newDistricts = [];
      const citySize = 20;

      for (let i = 0; i < citySize; i++) {
        newDistricts.push({
          x: Math.random() * 100,
          y: Math.random() * 100,
          temp: weather.current.temp + (Math.random() * 6 - 3),
          wind: weather.current.wind_speed * (0.5 + Math.random()),
          rain: weather.current.rain ? Math.random() * 100 : 0
        });
      }
      return newDistricts;
    };

    setDistricts(generateDistricts());
  }, [weather, location]);

  // Render map
  useEffect(() => {
    if (!canvasRef.current || !weather) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw districts
      districts.forEach(district => {
        const x = (district.x / 100) * canvas.width;
        const y = (district.y / 100) * canvas.height;

        ctx.fillStyle = getDistrictColor(district);
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const getDistrictColor = (district: any) => {
      switch (activeTab) {
        case 'temp':
          const tempScale = (district.temp - 32) / 40; // normalize around freezing
          return `hsl(${240 - tempScale * 240}, 70%, 50%)`;
        case 'wind':
          const windScale = district.wind / 20;
          return `hsl(160, ${windScale * 100}%, 50%)`;
        case 'rain':
          const rainScale = district.rain / 100;
          return `hsl(200, ${rainScale * 100}%, 50%)`;
        default:
          return '#fff';
      }
    };

    render();

    // Add weather effects
    if (weather.current.condition.toLowerCase().includes('rain')) {
      const raindrops: any[] = [];

      const addRaindrop = () => {
        raindrops.push({
          x: Math.random() * canvas.width,
          y: 0,
          speed: 5 + Math.random() * 10
        });
      };

      const animateRain = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (raindrops.length < 100) addRaindrop();

        raindrops.forEach((drop, i) => {
          ctx.fillStyle = '#6af';
          ctx.fillRect(drop.x, drop.y, 1, 4);
          drop.y += drop.speed;

          if (drop.y > canvas.height) {
            raindrops.splice(i, 1);
          }
        });

        requestAnimationFrame(animateRain);
      };

      animateRain();
    }

    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [weather, districts, activeTab]);

  if (!weather || !location) return null;

  return (
    <Card className="p-4 bg-black/30 backdrop-blur-lg border-gray-800/50">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-black/50">
          <TabsTrigger value="temp">Temperature</TabsTrigger>
          <TabsTrigger value="wind">Wind Speed</TabsTrigger>
          <TabsTrigger value="rain">Precipitation</TabsTrigger>
        </TabsList>
        <TabsContent value="temp">
        </TabsContent>
        <TabsContent value="wind">
        </TabsContent>
        <TabsContent value="rain">
        </TabsContent>
      </Tabs>

      <div className="mt-4 relative aspect-video">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full rounded-md"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    </Card>
  );
}