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
      
      const count = condition === 'Rain' ? 100 : 
                    condition === 'Snow' ? 50 :
                    condition === 'Clouds' ? 10 : 0;
                    
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: Math.random() * 2 + 1,
          radius: Math.random() * 2 + 1,
          angle: condition === 'Snow' ? Math.random() * Math.PI * 2 : 0
        });
      }
    };
    
    initParticles();
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        
        if (condition === 'Rain') {
          ctx.fillRect(p.x, p.y, 1, 4);
          p.y += p.speed * 15;
          if (p.y > canvas.height) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
          }
        }
        
        else if (condition === 'Snow') {
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          p.angle += 0.02;
          p.x += Math.sin(p.angle) * 2;
          p.y += p.speed;
          if (p.y > canvas.height) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
          }
        }
        
        else if (condition === 'Clouds') {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.arc(p.x, p.y, 50, 0, Math.PI * 2);
          ctx.fill();
          p.x += 0.2;
          if (p.x > canvas.width + 50) {
            p.x = -50;
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
