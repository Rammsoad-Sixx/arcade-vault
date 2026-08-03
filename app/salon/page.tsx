import Link from "next/link";
import { GAMES } from "@/lib/games-data";
import { getTopScores, formatScoreDate } from "@/lib/scores";

export default async function HallOfFame({
  searchParams,
}: {
  searchParams: Promise<{ juego?: string }>;
}) {
  const { juego } = await searchParams;
  const activeId = GAMES.some((g) => g.id === juego) ? juego! : GAMES[0].id;
  const rows = await getTopScores(activeId, 12);

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {GAMES.map((g) => (
          <Link
            key={g.id}
            href={`/salon?juego=${g.id}`}
            className={"chip" + (activeId === g.id ? " active" : "")}
          >
            {g.title}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: "var(--ink-faint)" }}>
          <div className="pixel" style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}>
            AÚN NO HAY PUNTUACIONES
          </div>
          <div>SÉ EL PRIMERO</div>
        </div>
      ) : (
        <div className="podium">
          {rows.length >= 2 && (
            <div className="podium-slot silver" style={{ gridColumn: 1 }}>
              <div className="rank-num">02</div>
              <div className="name">{rows[1].name}</div>
              <div className="score">{rows[1].score.toLocaleString("es-ES")}</div>
              <div className="date">{formatScoreDate(rows[1].created_at)}</div>
            </div>
          )}
          <div className="podium-slot gold" style={{ gridColumn: 2 }}>
            <div className="pixel" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}>
              CAMPEÓN
            </div>
            <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
              01
            </div>
            <div className="name">{rows[0].name}</div>
            <div className="score" style={{ fontSize: 20 }}>
              {rows[0].score.toLocaleString("es-ES")}
            </div>
            <div className="date">{formatScoreDate(rows[0].created_at)}</div>
          </div>
          {rows.length >= 3 && (
            <div className="podium-slot bronze" style={{ gridColumn: 3 }}>
              <div className="rank-num">03</div>
              <div className="name">{rows[2].name}</div>
              <div className="score">{rows[2].score.toLocaleString("es-ES")}</div>
              <div className="date">{formatScoreDate(rows[2].created_at)}</div>
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="hall-table">
          <div className="th">
            <div>RANGO</div>
            <div>JUGADOR</div>
            <div>PUNTUACIÓN</div>
            <div>FECHA</div>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.id}
              className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(i + 1).padStart(2, "0")}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              <div className="dt">{formatScoreDate(r.created_at)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
