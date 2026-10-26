import type { GameData, MonFields } from "@/game/types";

export const ALL_FIELDS: MonFields = {
  nature: true,
  ability: true,
  heldItem: true,
  gender: true,
  shiny: true,
};

export function monFields(game: Pick<GameData, "generation" | "fields">): MonFields {
  const { generation } = game;
  const byGeneration: MonFields = {
    nature: generation >= 3,
    ability: generation >= 3,
    heldItem: generation >= 2,
    gender: generation >= 2,
    shiny: generation >= 2,
  };
  return { ...byGeneration, ...game.fields };
}
