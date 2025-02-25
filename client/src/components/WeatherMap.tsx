
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

      // Draw dot matrix grid
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const xPos = x * spacing;
          const yPos = y * spacing;
          
          // Create wind effect offset
          const time = Date.now() / 1000;
          const windSpeed = weather.current.wind_speed || 0;
          const windOffset = Math.sin(time + x * 0.2 + y * 0.3) * (windSpeed / 10);
          
          // Different visualizations based on active tab
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

      // Draw weather direction indicator
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const windAngle = (weather.current.wind_deg || 0) * (Math.PI / 180);
      const radius = Math.min(canvas.width, canvas.height) / 4;

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(windAngle) * radius,
        centerY + Math.sin(windAngle) * radius
      );
      ctx.stroke();

      requestAnimationFrame(animate);
    };

    animate();
  }, [weather, activeTab]);

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
