"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function saveScore(
  gameId: string,
  name: string,
  score: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return { ok: false, error: "El nombre no puede estar vacío." };
  }

  if (!Number.isFinite(score) || score < 0) {
    return { ok: false, error: "Puntuación inválida." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("scores")
    .insert({ game_id: gameId, name: trimmedName, score });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
