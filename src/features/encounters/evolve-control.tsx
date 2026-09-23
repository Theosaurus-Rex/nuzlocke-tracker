import { ArrowUpIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNextEvolutions } from "@/game/pokeapi/queries";
import { speciesDisplayName } from "@/game/pokeapi/resolve";

import { PokeApiNotice } from "./pokeapi-notice";

export interface EvolveControlProps {
  id: string;
  speciesId: string;
  randomised: boolean;
  onEvolve: (speciesId: string) => void;
  onPickAny: () => void;
}

export function EvolveControl({
  id,
  speciesId,
  randomised,
  onEvolve,
  onPickAny,
}: EvolveControlProps): ReactNode {
  const next = useNextEvolutions(randomised ? null : speciesId);

  if (randomised) {
    return (
      <Button type="button" variant="outline" onClick={onPickAny}>
        <ArrowUpIcon />
        Evolve
      </Button>
    );
  }
  if (next.isError) {
    return <PokeApiNotice id={`${id}-notice`} query={next} loadingText="Loading evolutions…" />;
  }
  if (next.isPending) {
    return (
      <Button type="button" variant="outline" disabled>
        <ArrowUpIcon />
        Evolve
      </Button>
    );
  }
  if (next.data === undefined || next.data.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
        <ArrowUpIcon />
        Evolve
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {next.data.map((entry) => (
          <DropdownMenuItem key={entry.id} onClick={() => onEvolve(entry.name)}>
            {speciesDisplayName(entry.name)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
