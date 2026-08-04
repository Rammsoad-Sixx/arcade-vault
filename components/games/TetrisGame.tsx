"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { TetrisEngine } from "@/components/games/engine/tetris-engine";
import { DEFAULT_SKIN, type SkinId } from "@/lib/skins";

export interface TetrisGameProps {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onLinesChange: (lines: number) => void;
  onGameOver: (finalScore: number) => void;
  skin?: SkinId;
}

export interface TetrisGameHandle {
  pause: () => void;
  resume: () => void;
  reset: () => void;
  forceGameOver: () => void;
}

const TetrisGame = forwardRef<TetrisGameHandle, TetrisGameProps>(function TetrisGame(
  { onScoreChange, onLivesChange, onLevelChange, onLinesChange, onGameOver, skin = DEFAULT_SKIN },
  ref,
) {
  const boardCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisEngine | null>(null);

  useImperativeHandle(ref, () => ({
    pause: () => engineRef.current?.pause(),
    resume: () => engineRef.current?.resume(),
    reset: () => engineRef.current?.reset(),
    forceGameOver: () => engineRef.current?.forceGameOver(),
  }));

  useEffect(() => {
    const boardCanvas = boardCanvasRef.current;
    const nextCanvas = nextCanvasRef.current;
    if (!boardCanvas || !nextCanvas) return;

    const engine = new TetrisEngine(
      boardCanvas,
      nextCanvas,
      {
        onScoreChange,
        onLivesChange,
        onLevelChange,
        onLinesChange,
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
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <canvas
        ref={boardCanvasRef}
        width={300}
        height={600}
        style={{ height: "100%", width: "auto" }}
      />
      <canvas
        ref={nextCanvasRef}
        width={120}
        height={120}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 72,
          height: 72,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid var(--line)",
          borderRadius: 6,
        }}
      />
    </div>
  );
});

export default TetrisGame;
