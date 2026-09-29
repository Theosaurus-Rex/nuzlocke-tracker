import { useState, type FormEvent, type ReactNode } from "react";

import { CHIP_SHAPE } from "@/components/chip";
import { SpeciesSprite } from "@/components/species-sprite";
import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildCause,
  CAUSE_TYPES,
  STATUS_CAUSES,
  validateDeath,
  type CauseType,
  type DeathField,
} from "@/domain/death-validation";
import type { Mon, Route, StatusCause } from "@/domain/types";
import { EncounterDialogHeader } from "@/features/encounters/encounter-dialog-header";
import { MovePicker } from "@/features/encounters/move-picker";
import { SpeciesPicker } from "@/features/encounters/species-picker";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { GAMES } from "@/game/registry";
import { genderSymbol } from "@/lib/gender";
import { joinPresent } from "@/lib/join-present";
import { cn } from "@/lib/utils";
import { useLogDeath } from "@/storage/mutations";
import { useMons, useRoutes, useRun } from "@/storage/queries";

import { titleCase } from "./cause-text";

const UNKNOWN_ROUTE = "unknown";
const UNKNOWN_ROUTE_ITEM = { value: UNKNOWN_ROUTE, label: "Unknown" };
const STATUS_ITEMS = STATUS_CAUSES.map((status) => ({ value: status, label: titleCase(status) }));

function livingMons(mons: readonly Mon[]): Mon[] {
  const party = mons
    .filter((mon) => mon.status === "party")
    .sort((a, b) => (a.partySlot ?? 0) - (b.partySlot ?? 0));
  const box = mons
    .filter((mon) => mon.status === "box")
    .sort((a, b) => (a.boxOrder ?? 0) - (b.boxOrder ?? 0));
  return [...party, ...box];
}

function monLabel(mon: Mon): string {
  const species = speciesDisplayName(mon.speciesId);
  return mon.nickname !== null ? `“${mon.nickname}” ${species}` : species;
}

function FieldError({ id, message }: { id: string; message: string | undefined }): ReactNode {
  return message === undefined ? null : (
    <Typography as="p" id={id} variant="body" tone="alert" className="mt-1">
      {message}
    </Typography>
  );
}

export interface LogDeathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
}

export function LogDeathDialog({ open, onOpenChange, runId }: LogDeathDialogProps): ReactNode {
  const runQuery = useRun(runId);
  const monsQuery = useMons(runId);
  const routesQuery = useRoutes(runId);
  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;
  const living = livingMons(monsQuery.data ?? []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-0 left-0 flex h-full max-h-full w-full max-w-full flex-col gap-0 -translate-x-0 -translate-y-0 overflow-hidden rounded-none p-0",
          "sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
        )}
      >
        <EncounterDialogHeader title="Log a death" tone="alert" />
        {living.length > 0 && (
          <LogDeathForm
            living={living}
            routes={routesQuery.data ?? []}
            generation={generation}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface LogDeathFormProps {
  living: readonly Mon[];
  routes: readonly Route[];
  generation: number;
  onDone: () => void;
}

function LogDeathForm({ living, routes, generation, onDone }: LogDeathFormProps): ReactNode {
  const logDeath = useLogDeath();

  const [monChoice, setMonChoice] = useState<string | null>(null);
  const [type, setType] = useState<CauseType>("trainer");
  const [speciesId, setSpeciesId] = useState("");
  const [levelText, setLevelText] = useState("");
  const [move, setMove] = useState("");
  const [status, setStatus] = useState<StatusCause>("poison");
  const [detail, setDetail] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [routeChoice, setRouteChoice] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mon = living.find((m) => m.id === monChoice) ?? living[0]!;
  const routeValue = routeChoice ?? mon.caughtRouteId ?? UNKNOWN_ROUTE;
  const routeName = (id: string | null): string | null =>
    routes.find((route) => route.id === id)?.name ?? null;

  const values = { type, speciesId, level: Number(levelText), move, trainerName, status, detail };
  const errors: Partial<Record<DeathField, string>> = submitted ? validateDeath(values) : {};
  const attacker = type === "trainer" || type === "wild";

  const monItems = living.map((m) => ({ value: m.id, label: monLabel(m) }));
  const routeItems = [
    UNKNOWN_ROUTE_ITEM,
    ...routes.map((route) => ({ value: route.id, label: route.name })),
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateDeath(values)).length > 0) return;

    logDeath
      .mutateAsync({
        monId: mon.id,
        cause: buildCause(values),
        routeId: routeValue === UNKNOWN_ROUTE ? null : routeValue,
        notes: notes.trim() === "" ? null : notes.trim(),
        diedAt: new Date().toISOString(),
      })
      .then(onDone, () => undefined);
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <Typography as="label" variant="eyebrow" htmlFor="log-death-mon" className="mb-1 block">
            Who died
          </Typography>
          <Select items={monItems} value={mon.id} onValueChange={(next) => setMonChoice(next)}>
            <SelectTrigger
              id="log-death-mon"
              className="w-full bg-card py-2 data-[size=default]:h-auto"
            >
              <SelectValue>
                {(id: string) => (
                  <MonOption mon={living.find((m) => m.id === id) ?? mon} routeName={routeName} />
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {living.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <MonOption mon={m} routeName={routeName} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {attacker ? (
          <div role="group" aria-labelledby="log-death-lost-to">
            <Typography as="span" variant="eyebrow" id="log-death-lost-to" className="mb-1 block">
              Lost to *
            </Typography>
            <div className="flex items-start gap-3 border-[1.5px] border-border p-3">
              <SpeciesSprite
                speciesId={speciesId === "" ? null : speciesId}
                shiny={false}
                size={48}
              />
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_5rem_1fr]">
                <div>
                  <Typography
                    as="label"
                    variant="caption"
                    tone="muted"
                    htmlFor="log-death-species"
                    className="mb-1 block"
                  >
                    Species
                  </Typography>
                  <SpeciesPicker
                    id="log-death-species"
                    value={speciesId}
                    onChange={setSpeciesId}
                    generation={generation}
                    aria-invalid={errors.speciesId !== undefined}
                    aria-describedby={errors.speciesId ? "log-death-species-error" : undefined}
                  />
                  <FieldError id="log-death-species-error" message={errors.speciesId} />
                </div>
                <div>
                  <Typography
                    as="label"
                    variant="caption"
                    tone="muted"
                    htmlFor="log-death-level"
                    className="mb-1 block"
                  >
                    Level
                  </Typography>
                  <Input
                    id="log-death-level"
                    inputMode="numeric"
                    className="font-mono"
                    value={levelText}
                    onChange={(event) => setLevelText(event.target.value)}
                    aria-invalid={errors.level !== undefined}
                    aria-describedby={errors.level ? "log-death-level-error" : undefined}
                  />
                  <FieldError id="log-death-level-error" message={errors.level} />
                </div>
                <div>
                  <Typography
                    as="label"
                    variant="caption"
                    tone="muted"
                    htmlFor="log-death-move"
                    className="mb-1 block"
                  >
                    Move (optional)
                  </Typography>
                  <MovePicker id="log-death-move" value={move} onChange={setMove} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Typography
              as="label"
              variant="eyebrow"
              htmlFor="log-death-lost-to-field"
              className="mb-1 block"
            >
              Lost to *
            </Typography>
            {type === "status" ? (
              <Select
                items={STATUS_ITEMS}
                value={status}
                onValueChange={(next) => setStatus(next!)}
              >
                <SelectTrigger id="log-death-lost-to-field" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Input
                  id="log-death-lost-to-field"
                  value={detail}
                  onChange={(event) => setDetail(event.target.value)}
                  aria-invalid={errors.detail !== undefined}
                  aria-describedby={errors.detail ? "log-death-detail-error" : undefined}
                />
                <FieldError id="log-death-detail-error" message={errors.detail} />
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Typography as="span" variant="eyebrow" id="log-death-cause" className="mb-1 block">
              What killed it
            </Typography>
            <div role="group" aria-labelledby="log-death-cause" className="flex flex-wrap gap-2">
              {CAUSE_TYPES.map((option) => {
                const active = type === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setType(option)}
                    className={cn(
                      CHIP_SHAPE,
                      "cursor-pointer py-1.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      active ? "bg-flag" : "bg-background hover:bg-muted",
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {type === "trainer" && (
            <div>
              <Typography
                as="label"
                variant="eyebrow"
                htmlFor="log-death-trainer"
                className="mb-1 block"
              >
                Trainer (optional)
              </Typography>
              <Input
                id="log-death-trainer"
                value={trainerName}
                onChange={(event) => setTrainerName(event.target.value)}
              />
            </div>
          )}

          <div>
            <Typography
              as="label"
              variant="eyebrow"
              htmlFor="log-death-where"
              className="mb-1 block"
            >
              Where
            </Typography>
            <Select
              items={routeItems}
              value={routeValue}
              onValueChange={(next) => setRouteChoice(next)}
            >
              <SelectTrigger id="log-death-where" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {routeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Typography
              as="label"
              variant="eyebrow"
              htmlFor="log-death-notes"
              className="mb-1 block"
            >
              Notes (optional)
            </Typography>
            <Input
              id="log-death-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        {logDeath.isError && (
          <Typography as="p" role="alert" variant="body" tone="alert">
            Could not log the death: {logDeath.error.message}. Nothing was saved.
          </Typography>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t-[1.5px] border-border p-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={logDeath.isPending}
          className="bg-destructive text-primary-foreground hover:bg-destructive/90"
        >
          {logDeath.isPending ? "Saving…" : "Send to graveyard"}
        </Button>
      </div>
    </form>
  );
}

function MonOption({
  mon,
  routeName,
}: {
  mon: Mon;
  routeName: (id: string | null) => string | null;
}): ReactNode {
  return (
    <span className="flex items-center gap-3 text-left">
      <SpeciesSprite speciesId={mon.speciesId} shiny={mon.shiny} size={40} />
      <span className="flex flex-col">
        <span className="font-bold">{monLabel(mon)}</span>
        <span className="text-xs text-muted-foreground">
          {joinPresent([
            [genderSymbol(mon.gender), `L${String(mon.level)}`].filter(Boolean).join(" "),
            routeName(mon.caughtRouteId),
          ])}
        </span>
      </span>
    </span>
  );
}
