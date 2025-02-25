import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CloudRain, Wind } from 'lucide-react';

interface WeatherMapProps {
  lat: number;
  lon: number;
}

export default function WeatherMap({ lat, lon }: WeatherMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'precipitation' | 'wind'>('precipitation');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // Create dot matrix effect for the map
    const drawDotMatrix = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const spacing = 8;
      const intensity = mode === 'precipitation' ? 0.7 : 0.5;
      
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          const distance = Math.sqrt(
            Math.pow((x - canvas.width/2), 2) + 
            Math.pow((y - canvas.height/2), 2)
          );
          
          const alpha = Math.max(0, 1 - (distance / (canvas.width/2)));
          ctx.fillStyle = `rgba(255,255,255,${alpha * intensity})`;
          
          if (mode === 'wind') {
            // Draw wind direction arrows
            const angle = Math.atan2(y - canvas.height/2, x - canvas.width/2);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillRect(-1, -1, 2, 2);
            ctx.restore();
          } else {
            // Draw rain intensity dots
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      requestAnimationFrame(drawDotMatrix);
    };

    const animId = requestAnimationFrame(drawDotMatrix);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [mode]);

  return (
    <Card className="p-4 bg-black/50 backdrop-blur-sm border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-mono text-glow">WEATHER MAP</h2>
        <div className="flex gap-2">
          <Button
            variant={mode === 'precipitation' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('precipitation')}
            className="font-mono"
          >
            <CloudRain className="h-4 w-4 mr-2" />
            RAIN
          </Button>
          <Button
            variant={mode === 'wind' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('wind')}
            className="font-mono"
          >
            <Wind className="h-4 w-4 mr-2" />
            WIND
          </Button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-64 rounded border border-gray-800"
      />
    </Card>
  );
}
