import { useEffect, useRef } from 'react';
import { AudioPlayerEngine } from '../audio/engine';

interface SpectrumCanvasProps {
  engine: AudioPlayerEngine;
  isPlaying: boolean;
}

export function SpectrumCanvas({ engine, isPlaying }: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = new Uint8Array(new ArrayBuffer(64));
    let rafId = 0;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      engine.getFrequencyData(buffer);

      const barCount = 28;
      const gap = 3;
      const barWidth = (width - gap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        // Focus on lower/mid audible bins
        const binIndex = Math.min(buffer.length - 1, Math.floor(i * 1.4) + 1);
        const raw = isPlaying ? buffer[binIndex] / 255 : 0.06;
        const val = Math.max(0.08, Math.min(1, raw));
        const barHeight = val * (height - 4);
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        ctx.fillStyle = isPlaying ? 'rgba(30, 215, 96, 0.85)' : 'rgba(255, 255, 255, 0.16)';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (isPlaying) {
        rafId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [engine, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={260}
      height={44}
      className="w-full h-11 block"
      aria-label="Live audio frequency spectrum"
    />
  );
}
