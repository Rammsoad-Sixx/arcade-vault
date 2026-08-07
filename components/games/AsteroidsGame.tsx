"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { AsteroidsEngine } from "@/components/games/engine/asteroids-engine";
import { DEFAULT_SKIN, type SkinId } from "@/lib/skins";
import { TouchControls } from "@/components/games/TouchControls";
import { useIsMobileViewport } from "@/lib/use-is-mobile-viewport";

export interface AsteroidsGameProps {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  skin?: SkinId;
}

export interface AsteroidsGameHandle {
  pause: () => void;
  resume: () => void;
  reset: () => void;
  forceGameOver: () => void;
}

const AsteroidsGame = forwardRef<AsteroidsGameHandle, AsteroidsGameProps>(
  function AsteroidsGame(
    { onScoreChange, onLivesChange, onLevelChange, onGameOver, skin = DEFAULT_SKIN },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<AsteroidsEngine | null>(null);
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

      const engine = new AsteroidsEngine(
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
      <>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{ width: "100%", height: "100%", touchAction: "none" }}
        />
        {isMobile && (
          <TouchControls
            directions={{ left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp" }}
            actions={[{ code: "Space", label: "DISPARAR" }]}
            onPress={(code) => engineRef.current?.pressVirtualKey(code)}
            onRelease={(code) => engineRef.current?.releaseVirtualKey(code)}
          />
        )}
      </>
    );
  },
);

export default AsteroidsGame;
