import { useEffect, useRef, useState } from 'react';
import { Card } from './ui/card';
import { Weather } from '@/types';

type WeatherMapProps = {
  weather: Weather;
  lat: number;
  lon: number;
};

type Particle = {
  x: number;
  y: number;
  speed: number;
  angle: number;
};

type MapMode = 'precipitation' | 'wind' | 'temperature';

export default function WeatherMap({ weather, lat, lon }: WeatherMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<MapMode>('precipitation');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  let particles: Particle[] = [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles for weather effects
    const initParticles = () => {
      particles = [];
      let count = 0;

      if (mode === 'precipitation' && weather?.current?.precipitation > 0) {
        count = 100;
      } else if (mode === 'wind' && weather?.current?.windSpeed > 5) {
        count = 50;
      }

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: Math.random() * 2 + 1,
          angle: mode === 'wind' ? Math.PI * 0.25 : Math.PI * 0.5
        });
      }
    };

    // Convert lat/lon to canvas coordinates
    const latLonToCanvas = (lat: number, lon: number) => {
      const x = (lon + 180) * (canvas.width / 360);
      const y = (-lat + 90) * (canvas.height / 180);
      return { x, y };
    };

    // Draw matrix effect
    const drawMatrix = () => {
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(zoom, zoom);

      // Current location marker
      const pos = latLonToCanvas(lat, lon);

      // Draw base map dots
      const spacing = 8;
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          ctx.fillStyle = '#333333';
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Draw current location
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw weather particles
      ctx.fillStyle = '#666666';
      particles.forEach(particle => {
        let shouldShow = false;
        let color = '#666666';
        const intensity = Math.random() * 0.3 + 0.7;

        if (mode === 'precipitation' && weather?.current?.precipitation > 0) {
          shouldShow = true;
          color = `rgba(0,128,255,${intensity * 0.7})`;
        } else if (mode === 'wind' && weather?.current?.windSpeed > 5) {
          shouldShow = true;
          color = `rgba(128,255,128,${intensity * 0.7})`;
        }

        if (shouldShow) {
          ctx.fillStyle = color;
          ctx.fillRect(particle.x, particle.y, 1, 1);

          // Update particle position
          particle.x += Math.cos(particle.angle) * particle.speed;
          particle.y += Math.sin(particle.angle) * particle.speed;

          // Wrap particles
          if (particle.x < 0) particle.x = canvas.width;
          if (particle.x > canvas.width) particle.x = 0;
          if (particle.y < 0) particle.y = canvas.height;
          if (particle.y > canvas.height) particle.y = 0;
        }
      });

      ctx.restore();
    };

    // Handle mouse events
    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setOffset({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.max(0.5, Math.min(4, z * delta)));
    };

    // Set up event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);

    // Animation loop
    let animId: number;
    const spacing = 8;

    const animate = () => {
      drawMatrix();
      animId = requestAnimationFrame(animate);
    };

    // Initialize particles and start animation
    initParticles();
    animId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(animId);
    };
  }, [lat, lon, mode, zoom, offset, isDragging, dragStart, weather]);

  return (
    <Card className="p-4 bg-black/30 backdrop-blur-lg border-gray-800/50">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setMode('precipitation')}
            className={`px-3 py-1 border ${mode === 'precipitation' ? 'border-white bg-white/10' : 'border-gray-700'}`}
          >
            Rain
          </button>
          <button
            onClick={() => setMode('wind')}
            className={`px-3 py-1 border ${mode === 'wind' ? 'border-white bg-white/10' : 'border-gray-700'}`}
          >
            Wind
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="w-8 h-8 flex items-center justify-center border border-gray-700"
          >
            -
          </button>
          <button
            onClick={() => setZoom(z => Math.min(4, z + 0.1))}
            className="w-8 h-8 flex items-center justify-center border border-gray-700"
          >
            +
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-64 bg-black rounded border border-gray-800"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />
    </Card>
  );
}