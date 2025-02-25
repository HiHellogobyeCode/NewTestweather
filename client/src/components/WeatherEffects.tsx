import { useEffect, useRef } from 'react';

interface WeatherEffectsProps {
  condition: string;
}

export default function WeatherEffects({ condition }: WeatherEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    let particles: any[] = [];

    // Initialize particles based on weather condition
    const initParticles = () => {
      particles = [];

      const count = condition === 'Rain' ? 150 : 
                    condition === 'Snow' ? 100 :
                    condition === 'Clouds' ? 15 : 0;

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: Math.random() * 2 + 1,
          radius: Math.random() * 2 + 1,
          angle: condition === 'Snow' ? Math.random() * Math.PI * 2 : 0,
          opacity: Math.random() * 0.5 + 0.5
        });
      }
    };

    initParticles();

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        ctx.beginPath();

        if (condition === 'Rain') {
          ctx.strokeStyle = `rgba(255,255,255,${p.opacity})`;
          ctx.lineWidth = 1;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 1, p.y + 10);
          ctx.stroke();
          p.y += p.speed * 15;
          if (p.y > canvas.height) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
            p.opacity = Math.random() * 0.5 + 0.5;
          }
        }

        else if (condition === 'Snow') {
          ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          p.angle += 0.02;
          p.x += Math.sin(p.angle) * 2;
          p.y += p.speed;
          if (p.y > canvas.height) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
            p.opacity = Math.random() * 0.5 + 0.5;
          }
        }

        else if (condition === 'Clouds') {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 80);
          gradient.addColorStop(0, `rgba(255,255,255,${p.opacity * 0.2})`);
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gradient;
          ctx.arc(p.x, p.y, 80, 0, Math.PI * 2);
          ctx.fill();
          p.x += 0.2;
          if (p.x > canvas.width + 80) {
            p.x = -80;
            p.opacity = Math.random() * 0.5 + 0.5;
          }
        }
      });

      requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [condition]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}