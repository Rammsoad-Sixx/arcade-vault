"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { CANVAS_H, CANVAS_W, FroggerEngine } from "@/components/games/engine/frogger-engine";
import { DEFAULT_SKIN, type SkinId } from "@/lib/skins";
import { TouchControls } from "@/components/games/TouchControls";
import { useIsMobileViewport } from "@/lib/use-is-mobile-viewport";

export interface FroggerGameProps {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onTimeChange: (secondsLeft: number) => void;
  onGameOver: (finalScore: number) => void;
  skin?: SkinId;
}

export interface FroggerGameHandle {
  pause: () => void;
  resume: () => void;
  reset: () => void;
  forceGameOver: () => void;
}

const FroggerGame = forwardRef<FroggerGameHandle, FroggerGameProps>(function FroggerGame(
  { onScoreChange, onLivesChange, onLevelChange, onTimeChange, onGameOver, skin = DEFAULT_SKIN },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FroggerEngine | null>(null);
  const isMobile = useIsMobileViewport();

  useImperativeHandle(ref, () => ({
    pause: () => engineRef.current?.pause(),
    resume: () => engineRef.current?.resume(),
    reset: () => engineRef.current?.reset(),
    forceGameOver: () => engineRef.current?.forceGameOver(),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new FroggerEngine(
      canvas,
      {
        onScoreChange,
        onLivesChange,
        onLevelChange,
        onTimeChange,
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
    <>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ width: "100%", height: "100%", touchAction: "none" }}
      />
      {isMobile && (
        <TouchControls
          directions={{ up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }}
          actions={[]}
          repeatDirections={[]}
          onPress={(code) => engineRef.current?.pressVirtualKey(code)}
          onRelease={() => {}}
        />
      )}
    </>
  );
});

export default FroggerGame;
