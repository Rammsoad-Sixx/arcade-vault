"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GAMES } from "@/lib/games-data";
import { useUser } from "@/lib/user-context";
import AsteroidsGame, { type AsteroidsGameHandle } from "@/components/games/AsteroidsGame";
import TetrisGame, { type TetrisGameHandle } from "@/components/games/TetrisGame";
import BloqueBusterGame, { type BloqueBusterGameHandle } from "@/components/games/BloqueBusterGame";
import { saveScore } from "./actions";

export default function GamePlayer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const game = GAMES.find((g) => g.id === id);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const asteroidsRef = useRef<AsteroidsGameHandle>(null);
  const tetrisRef = useRef<TetrisGameHandle>(null);
  const bloqueBusterRef = useRef<BloqueBusterGameHandle>(null);

  const isAsteroids = id === "asteroides";
  const isTetris = id === "caida";
  const isBloqueBuster = id === "bloque-buster";
  const name = nameOverride ?? (user ? user.name : "INVITADO");

  useEffect(() => {
    if (over || paused || isAsteroids || isTetris || isBloqueBuster) return;
    const t = setInterval(() => {
      setScore((s) => {
        const next = s + Math.floor(10 + Math.random() * 90);
        if (next > 0 && next % 2500 < 100) setLevel((l) => l + 1);
        return next;
      });
    }, 220);
    return () => clearInterval(t);
  }, [over, paused, isAsteroids, isTetris, isBloqueBuster]);

  if (!game) return null;

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setOver(true);
  };

  const endGame = () => {
    if (isAsteroids) {
      asteroidsRef.current?.forceGameOver();
    } else if (isTetris) {
      tetrisRef.current?.forceGameOver();
    } else if (isBloqueBuster) {
      bloqueBusterRef.current?.forceGameOver();
    } else {
      setOver(true);
    }
  };

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      if (isAsteroids) {
        if (next) asteroidsRef.current?.pause();
        else asteroidsRef.current?.resume();
      } else if (isTetris) {
        if (next) tetrisRef.current?.pause();
        else tetrisRef.current?.resume();
      } else if (isBloqueBuster) {
        if (next) bloqueBusterRef.current?.pause();
        else bloqueBusterRef.current?.resume();
      }
      return next;
    });
  };

  const restart = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setLines(0);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setPending(false);
    setSaveError(null);
    setNameOverride(null);
    if (isAsteroids) {
      asteroidsRef.current?.reset();
    } else if (isTetris) {
      tetrisRef.current?.reset();
    } else if (isBloqueBuster) {
      bloqueBusterRef.current?.reset();
    }
  };

  const handleSaveScore = async () => {
    setPending(true);
    setSaveError(null);
    const result = await saveScore(game.id, name, score);
    setPending(false);
    if (result.ok) {
      setSaved(true);
    } else {
      setSaveError(result.error);
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
          {isTetris && (
            <div className="hud-stat">
              <div className="l">Líneas</div>
              <div className="v">{lines}</div>
            </div>
          )}
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button className="btn ghost" onClick={() => router.push(`/juegos/${game.id}`)}>
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroids ? (
            <AsteroidsGame
              ref={asteroidsRef}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setLevel}
              onGameOver={handleGameOver}
            />
          ) : isTetris ? (
            <TetrisGame
              ref={tetrisRef}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setLevel}
              onLinesChange={setLines}
              onGameOver={handleGameOver}
            />
          ) : isBloqueBuster ? (
            <BloqueBusterGame
              ref={bloqueBusterRef}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setLevel}
              onGameOver={handleGameOver}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>
            {game.title} · CRT-83 · 60 HZ
          </span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setNameOverride(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={handleSaveScore} disabled={pending}>
                  {pending ? "GUARDANDO..." : "GUARDAR PUNTUACIÓN"}
                </button>
                {saveError && <div className="toast-error">▸ ERROR: {saveError}</div>}
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button className="btn magenta" onClick={() => router.push("/biblioteca")}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
