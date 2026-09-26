import type { ReactNode } from "react";

import { useSpecies } from "@/game/pokeapi/queries";
import { typesIn } from "@/game/pokeapi/resolve";
import { cn } from "@/lib/utils";

import { CHIP_SHAPE } from "./chip";
import { TypeBadge, type TypeBadgeType } from "./type-badge";

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

  const types = typesIn(species.data, generation).filter(
    (type): type is TypeBadgeType => type !== "unknown",
  );
  if (types.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {types.map((type) => (
        <TypeBadge key={type} type={type} />
      ))}
    </span>
  );
}
