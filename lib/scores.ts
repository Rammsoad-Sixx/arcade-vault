import { createClient } from "@/lib/supabase/server";

export interface ScoreRow {
  id: number;
  game_id: string;
  name: string;
  score: number;
  created_at: string;
}

export async function getTopScores(
  gameId: string,
  limit: number
): Promise<ScoreRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return data;
}

export function formatScoreDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
