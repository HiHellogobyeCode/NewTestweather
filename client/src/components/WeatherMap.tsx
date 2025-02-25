
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

  useEffect(() => {
    if (!weather || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const dotSize = 2;
    const spacing = 10;
    const cols = Math.floor(canvas.width / spacing);
    const rows = Math.floor(canvas.height / spacing);

    const animate = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw base dot matrix
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const xPos = x * spacing;
          const yPos = y * spacing;
          
          const time = Date.now() / 1000;
          const windSpeed = weather.current.wind_speed || 0;
          const windOffset = Math.sin(time + x * 0.2 + y * 0.3) * (windSpeed / 10);
          
          let dotColor;
          if (activeTab === 'temp') {
            const temp = weather.current.temp;
            const hue = Math.max(0, Math.min(240, (100 - temp) * 2.4));
            dotColor = `hsl(${hue}, 70%, ${50 + Math.sin(time + x * 0.1) * 20}%)`;
          } else if (activeTab === 'rain') {
            const opacity = weather.current.rain ? 
              (0.3 + Math.sin(time + x * 0.2 + y * 0.2) * 0.2) : 0.2;
            dotColor = `rgba(0, 100, 255, ${opacity})`;
          } else if (activeTab === 'wind') {
            const opacity = 0.3 + Math.sin(time + x * 0.1 + y * 0.1) * 0.2;
            dotColor = `rgba(150, 150, 150, ${opacity})`;
          }

          ctx.fillStyle = dotColor || '#666';
          ctx.fillRect(xPos + windOffset, yPos, dotSize, dotSize);
        }
      }

      // Draw roads (white dots)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < canvas.width; i += spacing * 2) {
        for (let y = 0; y < canvas.height; y += spacing) {
          ctx.fillRect(i, y, dotSize, dotSize);
        }
      }
      for (let i = 0; i < canvas.height; i += spacing * 2) {
        for (let x = 0; x < canvas.width; x += spacing) {
          ctx.fillRect(x, i, dotSize, dotSize);
        }
      }

      // Draw city names and markers
      ctx.font = '12px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      
      if (weather.nearby) {
        weather.nearby.forEach((city: any, i: number) => {
          const angle = (i * Math.PI * 2) / weather.nearby.length;
          const distance = Math.min(canvas.width, canvas.height) / 3;
          const x = canvas.width/2 + Math.cos(angle) * distance;
          const y = canvas.height/2 + Math.sin(angle) * distance;

          // City dot
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();

          // City name
          ctx.fillStyle = '#fff';
          ctx.fillText(city.name, x, y - 10);
        });
      }

      // Draw user location
      if (location) {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(canvas.width/2, canvas.height/2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw wind direction (subtle dots instead of line)
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const windAngle = (weather.current.wind_deg || 0) * (Math.PI / 180);
      const radius = Math.min(canvas.width, canvas.height) / 4;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let i = 0; i < radius; i += spacing) {
        const x = centerX + Math.cos(windAngle) * i;
        const y = centerY + Math.sin(windAngle) * i;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(animate);
    };

    animate();
  }, [weather, activeTab, location]);

  return (
    <Card className="p-4 bg-black/30 backdrop-blur-lg border-gray-800/50">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-black/50">
          <TabsTrigger value="temp">TEMP</TabsTrigger>
          <TabsTrigger value="rain">RAIN</TabsTrigger>
          <TabsTrigger value="wind">WIND</TabsTrigger>
        </TabsList>
      </Tabs>
      <canvas 
        ref={canvasRef}
        className="w-full h-[300px] mt-4 rounded-lg"
        style={{ imageRendering: 'pixelated' }}
      />
    </Card>
  );
}
