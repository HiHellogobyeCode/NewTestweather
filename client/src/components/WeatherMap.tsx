import React, { useEffect, useRef, useState } from 'react';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface WeatherMapProps {
  weather: any;
  location: { lat: number; lon: number } | null;
}

export default function WeatherMap({ weather, location }: WeatherMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState('temp');
  const [districts, setDistricts] = useState<any[]>([]);

  useEffect(() => {
    if (!weather || !location || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw weather visualization
    const drawWeatherMap = () => {
      const dotSize = 2;
      const spacing = 15;
      const rows = Math.floor(canvas.height / spacing);
      const cols = Math.floor(canvas.width / spacing);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const xPos = x * spacing;
          const yPos = y * spacing;

          // Different visualizations based on active tab
          if (activeTab === 'temp') {
            const temp = weather.current.temp;
            const hue = Math.max(0, Math.min(240, (100 - temp) * 2.4));
            ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
          } else if (activeTab === 'rain') {
            const opacity = weather.current.rain ? 0.7 : 0.2;
            ctx.fillStyle = `rgba(0, 100, 255, ${opacity})`;
          } else if (activeTab === 'wind') {
            const windSpeed = weather.current.wind_speed;
            const offset = Math.sin(Date.now() / 1000 + x + y) * (windSpeed / 10);
            ctx.fillStyle = `rgba(150, 150, 150, 0.7)`;
            ctx.fillRect(xPos + offset, yPos, dotSize, dotSize);
            continue;
          }

          ctx.fillRect(xPos, yPos, dotSize, dotSize);
        }
      }
    };

    const animate = () => {
      drawWeatherMap();
      requestAnimationFrame(animate);
    };

    animate();
  }, [weather, location, activeTab]);

  return (
    <Card className="p-4 bg-black/30 backdrop-blur-lg border-gray-800/50">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-black/50">
          <TabsTrigger value="temp">TEMP</TabsTrigger>
          <TabsTrigger value="rain">RAIN</TabsTrigger>
          <TabsTrigger value="wind">WIND</TabsTrigger>
        </TabsList>
        <TabsContent value="temp">
        </TabsContent>
        <TabsContent value="wind">
        </TabsContent>
        <TabsContent value="rain">
        </TabsContent>
      </Tabs>
      <canvas 
        ref={canvasRef}
        className="w-full h-[300px] mt-4"
        style={{ imageRendering: 'pixelated' }}
      />
    </Card>
  );
}