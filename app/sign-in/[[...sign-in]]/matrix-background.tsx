"use client";

import { useEffect, useRef } from "react";

export default function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;

    if (!canvasElement) {
      return;
    }

    const context2d = canvasElement.getContext("2d");

    if (!context2d) {
      return;
    }

    const canvas: HTMLCanvasElement = canvasElement;
    const ctx: CanvasRenderingContext2D = context2d;

    let animationFrameId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const fontSize = 16;
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ";

    let columns = Math.floor(width / fontSize);
    let drops = Array.from({ length: columns }, () =>
      Math.floor((Math.random() * height) / fontSize),
    );

    const resizeCanvas = () => {
      const pixelRatio = window.devicePixelRatio || 1;

      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      columns = Math.floor(width / fontSize);
      drops = Array.from({ length: columns }, () =>
        Math.floor((Math.random() * height) / fontSize),
      );
    };

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.13)";
      ctx.fillRect(0, 0, width, height);

      const gradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        0,
        width * 0.5,
        height * 0.45,
        Math.max(width, height) * 0.65,
      );

      gradient.addColorStop(0, "rgba(34, 197, 94, 0.13)");
      gradient.addColorStop(0.35, "rgba(22, 163, 74, 0.04)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px monospace`;

      for (let index = 0; index < drops.length; index += 1) {
        const characterIndex = Math.floor(Math.random() * characters.length);
        const text = characters.charAt(characterIndex) || "0";

        const x = index * fontSize;
        const currentDrop = drops[index] ?? 0;
        const y = currentDrop * fontSize;

        const isBright = Math.random() > 0.965;

        ctx.fillStyle = isBright
          ? "rgba(187, 247, 208, 0.95)"
          : "rgba(34, 197, 94, 0.78)";

        ctx.shadowColor = "rgba(34, 197, 94, 0.9)";
        ctx.shadowBlur = isBright ? 16 : 8;
        ctx.fillText(text, x, y);

        if (y > height && Math.random() > 0.975) {
          drops[index] = 0;
        } else {
          drops[index] = currentDrop + 1;
        }
      }

      ctx.shadowBlur = 0;

      animationFrameId = window.requestAnimationFrame(draw);
    };

    resizeCanvas();
    draw();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full bg-black"
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.18),rgba(0,0,0,0.55)_38%,rgba(0,0,0,0.95)_100%)]"
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.72),rgba(0,0,0,0.22),rgba(0,0,0,0.72))]"
        aria-hidden="true"
      />
    </>
  );
}