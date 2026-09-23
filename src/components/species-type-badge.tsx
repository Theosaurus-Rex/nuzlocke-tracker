import type { ReactNode } from "react";

import { useSpecies } from "@/game/pokeapi/queries";
import { typesIn } from "@/game/pokeapi/resolve";
import { cn } from "@/lib/utils";

import { CHIP_SHAPE } from "./chip";
import { TypeBadge } from "./type-badge";

export interface SpeciesTypeBadgeProps {
  speciesId: string | null;
  generation: number;
}

export function SpeciesTypeBadge({ speciesId, generation }: SpeciesTypeBadgeProps): ReactNode {
  const species = useSpecies(speciesId);

  if (speciesId === null || speciesId === "") return null;
  if (species.isPending) {
    return (
      <span aria-hidden="true" className={cn(CHIP_SHAPE, "invisible")}>
        normal
      </span>
    );
  }
  if (species.isError) return null;

  const primary = typesIn(species.data, generation)[0];
  if (primary === undefined || primary === "unknown") return null;
  return <TypeBadge type={primary} />;
}
