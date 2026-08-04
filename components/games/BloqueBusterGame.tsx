"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { BloqueBusterEngine } from "@/components/games/engine/bloque-buster-engine";
import { DEFAULT_SKIN, type SkinId } from "@/lib/skins";

export interface BloqueBusterGameProps {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  skin?: SkinId;
}

export interface BloqueBusterGameHandle {
  pause: () => void;
  resume: () => void;
  reset: () => void;
  forceGameOver: () => void;
}

const BloqueBusterGame = forwardRef<BloqueBusterGameHandle, BloqueBusterGameProps>(
  function BloqueBusterGame(
    { onScoreChange, onLivesChange, onLevelChange, onGameOver, skin = DEFAULT_SKIN },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<BloqueBusterEngine | null>(null);

    useImperativeHandle(ref, () => ({
      pause: () => engineRef.current?.pause(),
      resume: () => engineRef.current?.resume(),
      reset: () => engineRef.current?.reset(),
      forceGameOver: () => engineRef.current?.forceGameOver(),
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const engine = new BloqueBusterEngine(
        canvas,
        {
          onScoreChange,
          onLivesChange,
          onLevelChange,
          onGameOver,
        },
        skin,
      );
      engineRef.current = engine;
      engine.start();

      return () => {
        engine.destroy();
        engineRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      engineRef.current?.setSkin(skin);
    }, [skin]);

    return (
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ width: "100%", height: "100%" }}
      />
    );
  },
);

export default BloqueBusterGame;
