import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CloudRain, Wind, Thermometer, Maximize } from 'lucide-react';

interface WeatherMapProps {
  lat: number;
  lon: number;
}

type MapMode = 'precipitation' | 'wind' | 'temperature';

export default function WeatherMap({ lat, lon }: WeatherMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<MapMode>('precipitation');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset view function
  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

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

    // USA boundaries (approximate)
    const USA = {
      minLat: 24.396308,
      maxLat: 49.384358,
      minLon: -125.000000,
      maxLon: -66.934570
    };

    let particles: Array<{x: number; y: number; speed: number; angle: number}> = [];

    // Initialize particles for weather effects
    const initParticles = () => {
      particles = [];
      const count = (mode === 'precipitation' && weatherData?.precipitation > 0) ? 100 : 
                    (mode === 'wind' && weatherData?.windSpeed > 5) ? 50 : 0;

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: Math.random() * 2 + 1,
          angle: mode === 'wind' ? Math.PI / 4 : Math.PI / 2 // Wind direction or straight down
        });
      }
    };

    initParticles();

    // Convert lat/lon to canvas coordinates
    const latLonToCanvas = (lat: number, lon: number) => {
      const x = ((lon - USA.minLon) / (USA.maxLon - USA.minLon)) * canvas.width;
      const y = canvas.height - ((lat - USA.minLat) / (USA.maxLat - USA.minLat)) * canvas.height;
      return { x, y };
    };

    // Draw dot matrix effect for the map
    const drawMatrix = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const spacing = 6; // Smaller spacing for more detailed map
      const radius = 120; // Larger radius for effect

      // Apply zoom and pan transformation
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(zoom, zoom);

      // Current location marker
      const pos = latLonToCanvas(lat, lon);

      // Draw base map dots
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          // Convert canvas coordinates back to lat/lon
          const currentLon = USA.minLon + (x / canvas.width) * (USA.maxLon - USA.minLon);
          const currentLat = USA.minLat + ((canvas.height - y) / canvas.height) * (USA.maxLat - USA.minLat);

          // Skip points outside the USA boundaries
          if (currentLat < USA.minLat || currentLat > USA.maxLat || 
              currentLon < USA.minLon || currentLon > USA.maxLon) {
            continue;
          }

          const dx = x - pos.x;
          const dy = y - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Only show effects for rain or high wind
          let shouldShow = false;
          let color;
          let intensity = Math.max(0, 1 - (dist / (radius * zoom)));

          switch (mode) {
            case 'precipitation':
              // Only show if there's precipitation
              if (weatherData?.precipitation > 0) {
                shouldShow = true;
                color = `rgba(0,128,255,${intensity * 0.7})`;
              }
              break;
            case 'wind':
              // Only show if wind speed > 5mph
              if (weatherData?.windSpeed > 5) {
                shouldShow = true;
                color = `rgba(128,255,128,${intensity * 0.7})`;
              }
              break;
            case 'temperature':
              color = `rgba(255,128,0,${intensity * 0.7})`;
              shouldShow = true;
              break;
          }

          if (shouldShow) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Update and draw weather effect particles
      particles.forEach(p => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;

        if (p.y > canvas.height) p.y = 0;
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;

        ctx.beginPath();
        if (mode === 'precipitation') {
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + 4);
        } else if (mode === 'wind') {
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(p.angle) * 8, p.y + Math.sin(p.angle) * 8);
        }
        ctx.stroke();
      });

      // Draw current location marker
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
      requestAnimationFrame(drawMatrix);
    };

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      const rect = canvas.getBoundingClientRect();
      setDragStart({ 
        x: e.clientX - offset.x - rect.left,
        y: e.clientY - offset.y - rect.top
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        setOffset({
          x: e.clientX - dragStart.x - rect.left,
          y: e.clientY - dragStart.y - rect.top
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.max(1, Math.min(5, z * delta)));
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);

    const animId = requestAnimationFrame(drawMatrix);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(animId);
    };
  }, [lat, lon, mode, zoom, offset, isDragging, dragStart]);

  return (
    <Card className="p-4 bg-black/30 backdrop-blur-lg border-gray-800/50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-mono text-glow-subtle">WEATHER MAP</h2>
        <div className="flex gap-2">
          <Button
            variant={mode === 'precipitation' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('precipitation')}
            className="font-mono backdrop-blur-sm bg-gray-900/30 border-gray-700/50"
          >
            <CloudRain className="h-4 w-4 mr-2" />
            RAIN
          </Button>
          <Button
            variant={mode === 'wind' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('wind')}
            className="font-mono backdrop-blur-sm bg-gray-900/30 border-gray-700/50"
          >
            <Wind className="h-4 w-4 mr-2" />
            WIND
          </Button>
          <Button
            variant={mode === 'temperature' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('temperature')}
            className="font-mono backdrop-blur-sm bg-gray-900/30 border-gray-700/50"
          >
            <Thermometer className="h-4 w-4 mr-2" />
            TEMP
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
            className="font-mono backdrop-blur-sm bg-gray-900/30 border-gray-700/50"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-64 rounded border border-gray-800/30 cursor-move"
      />
      <p className="text-xs text-gray-500 mt-2 text-center">
        Scroll to zoom, drag to pan
      </p>
    </Card>
  );
}