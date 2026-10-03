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
import { boxLayout } from "@/domain/box-slots";
import { countByMonStatus } from "@/domain/derive";
import { MAX_PARTY_SIZE } from "@/domain/transitions";
import type { Death, Mon, Route, StatusCause } from "@/domain/types";
import { EncounterDialogHeader } from "@/features/encounters/encounter-dialog-header";
import { monTitle } from "@/features/encounters/mon-title";
import { PlacementField, type Placement } from "@/features/encounters/placement-field";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { GAMES } from "@/game/registry";
import { genderSymbol } from "@/lib/gender";
import { joinPresent } from "@/lib/join-present";
import { cn } from "@/lib/utils";
import { useEditDeath, useLogDeath, useUndoDeath } from "@/storage/mutations";
import { useMons, useRoutes, useRun } from "@/storage/queries";

import { AttackerFields } from "./attacker-fields";
import { titleCase } from "./cause-text";

const UNKNOWN_ROUTE = "unknown";
const UNKNOWN_ROUTE_ITEM = { value: UNKNOWN_ROUTE, label: "Unknown" };
const STATUS_ITEMS = STATUS_CAUSES.map((status) => ({ value: status, label: titleCase(status) }));

function livingMons(mons: readonly Mon[]): Mon[] {
  const party = mons
    .filter((mon) => mon.status === "party")
    .sort((a, b) => (a.partySlot ?? 0) - (b.partySlot ?? 0));
  const layout = boxLayout(mons);
  const box = mons
    .filter((mon) => mon.status === "box")
    .sort((a, b) => (layout.get(a.id) ?? 0) - (layout.get(b.id) ?? 0));
  return [...party, ...box];
}

function monLabel(mon: Mon): string {
  const species = speciesDisplayName(mon.speciesId);
  return mon.nickname !== null ? `“${mon.nickname}” ${species}` : species;
}

function initialValuesFrom(death: Death | undefined) {
  const cause = death?.cause;
  return {
    type: cause?.type ?? "trainer",
    speciesId: cause !== undefined && "species" in cause ? cause.species : "",
    levelText: cause !== undefined && "level" in cause ? String(cause.level) : "",
    move: cause !== undefined && "move" in cause ? (cause.move ?? "") : "",
    status: cause?.type === "status" ? cause.status : "poison",
    detail: cause?.type === "other" ? cause.detail : "",
    trainerName: cause?.type === "trainer" ? (cause.trainerName ?? "") : "",
    routeChoice: death === undefined ? null : (death.routeId ?? UNKNOWN_ROUTE),
    notes: death?.notes ?? "",
  };
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
  death?: Death;
}

export function LogDeathDialog({
  open,
  onOpenChange,
  runId,
  death,
}: LogDeathDialogProps): ReactNode {
  const runQuery = useRun(runId);
  const monsQuery = useMons(runId);
  const routesQuery = useRoutes(runId);
  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;
  const allMons = monsQuery.data ?? [];
  const deadMon = death && allMons.find((mon) => mon.id === death.monId);
  const choices = death ? (deadMon ? [deadMon] : []) : livingMons(allMons);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-0 left-0 flex h-full max-h-full w-full max-w-full flex-col gap-0 -translate-x-0 -translate-y-0 overflow-hidden rounded-none p-0",
          "sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
        )}
      >
        <EncounterDialogHeader title={death ? "Edit death" : "Log a death"} tone="alert" />
        {choices.length > 0 && (
          <LogDeathForm
            mons={choices}
            death={death}
            routes={routesQuery.data ?? []}
            generation={generation}
            partyFull={countByMonStatus(allMons).party >= MAX_PARTY_SIZE}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface LogDeathFormProps {
  mons: readonly Mon[];
  death: Death | undefined;
  routes: readonly Route[];
  generation: number;
  partyFull: boolean;
  onDone: () => void;
}

function LogDeathForm({
  mons,
  death,
  routes,
  generation,
  partyFull,
  onDone,
}: LogDeathFormProps): ReactNode {
  const logDeath = useLogDeath();
  const editDeath = useEditDeath();
  const save = death ? editDeath : logDeath;
  const initial = initialValuesFrom(death);

  const [monChoice, setMonChoice] = useState<string | null>(null);
  const [type, setType] = useState<CauseType>(initial.type);
  const [speciesId, setSpeciesId] = useState(initial.speciesId);
  const [levelText, setLevelText] = useState(initial.levelText);
  const [move, setMove] = useState(initial.move);
  const [status, setStatus] = useState<StatusCause>(initial.status);
  const [detail, setDetail] = useState(initial.detail);
  const [trainerName, setTrainerName] = useState(initial.trainerName);
  const [routeChoice, setRouteChoice] = useState<string | null>(initial.routeChoice);
  const [notes, setNotes] = useState(initial.notes);
  const [submitted, setSubmitted] = useState(false);
  const [confirmingUndo, setConfirmingUndo] = useState(false);

  const mon = mons.find((m) => m.id === monChoice) ?? mons[0]!;
  const routeValue = routeChoice ?? mon.caughtRouteId ?? UNKNOWN_ROUTE;
  const routeName = (id: string | null): string | null =>
    routes.find((route) => route.id === id)?.name ?? null;

  const values = { type, speciesId, level: Number(levelText), move, trainerName, status, detail };
  const errors: Partial<Record<DeathField, string>> = submitted ? validateDeath(values) : {};
  const attacker = type === "trainer" || type === "wild";

  const monItems = mons.map((m) => ({ value: m.id, label: monLabel(m) }));
  const routeItems = [
    UNKNOWN_ROUTE_ITEM,
    ...routes.map((route) => ({ value: route.id, label: route.name })),
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateDeath(values)).length > 0) return;

    const built = buildCause(values);
    const previous = death?.cause;
    const cause =
      built.type === "trainer" &&
      built.trainerName === null &&
      previous?.type === "trainer" &&
      previous.fightId !== null
        ? { ...built, fightId: previous.fightId }
        : built;
    const routeId = routeValue === UNKNOWN_ROUTE ? null : routeValue;
    const trimmedNotes = notes.trim() === "" ? null : notes.trim();

    const saved = death
      ? editDeath.mutateAsync({ deathId: death.id, cause, routeId, notes: trimmedNotes })
      : logDeath.mutateAsync({
          monId: mon.id,
          cause,
          routeId,
          notes: trimmedNotes,
          diedAt: new Date().toISOString(),
        });
    saved.then(onDone, () => undefined);
  }

  if (confirmingUndo && death) {
    return (
      <UndoDeathConfirm
        death={death}
        mon={mon}
        partyFull={partyFull}
        onBack={() => setConfirmingUndo(false)}
        onDone={onDone}
      />
    );
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          {death ? (
            <Typography as="span" id="log-death-mon-label" variant="eyebrow" className="mb-1 block">
              Who died
            </Typography>
          ) : (
            <Typography as="label" variant="eyebrow" htmlFor="log-death-mon" className="mb-1 block">
              Who died
            </Typography>
          )}
          {death ? (
            <div
              role="group"
              aria-labelledby="log-death-mon-label"
              className="border-[1.5px] border-border bg-card px-3 py-2"
            >
              <MonOption mon={mon} routeName={routeName} />
            </div>
          ) : (
            <Select items={monItems} value={mon.id} onValueChange={(next) => setMonChoice(next)}>
              <SelectTrigger
                id="log-death-mon"
                className="w-full bg-card py-2 data-[size=default]:h-auto"
              >
                <SelectValue>
                  {(id: string) => (
                    <MonOption mon={mons.find((m) => m.id === id) ?? mon} routeName={routeName} />
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {mons.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <MonOption mon={m} routeName={routeName} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {attacker ? (
          <div role="group" aria-labelledby="log-death-lost-to">
            <Typography as="span" variant="eyebrow" id="log-death-lost-to" className="mb-1 block">
              Lost to *
            </Typography>
            <AttackerFields
              idPrefix="log-death"
              generation={generation}
              speciesId={speciesId}
              levelText={levelText}
              move={move}
              errors={errors}
              onSpeciesChange={setSpeciesId}
              onLevelChange={setLevelText}
              onMoveChange={setMove}
            />
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

        {save.isError && (
          <Typography as="p" role="alert" variant="body" tone="alert">
            Could not {death ? "save the death" : "log the death"}: {save.error?.message}. Nothing
            was saved.
          </Typography>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t-[1.5px] border-border p-4">
        {death && (
          <Button
            type="button"
            variant="ghost"
            className="mr-auto"
            onClick={() => setConfirmingUndo(true)}
          >
            This wasn't a death
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={save.isPending}
          className="bg-destructive text-primary-foreground hover:bg-destructive/90"
        >
          {save.isPending ? "Saving…" : death ? "Save changes" : "Send to graveyard"}
        </Button>
      </div>
    </form>
  );
}

interface UndoDeathConfirmProps {
  death: Death;
  mon: Mon;
  partyFull: boolean;
  onBack: () => void;
  onDone: () => void;
}

function UndoDeathConfirm({
  death,
  mon,
  partyFull,
  onBack,
  onDone,
}: UndoDeathConfirmProps): ReactNode {
  const undoDeath = useUndoDeath();
  const [placement, setPlacement] = useState<Placement>("box");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    undoDeath.mutateAsync({ deathId: death.id, placement }).then(onDone, () => undefined);
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Typography as="p" variant="body">
          Bring {monTitle(mon)} back? This deletes the death record.
        </Typography>
        <PlacementField
          id="undo-death-placement"
          value={placement}
          onChange={setPlacement}
          partyFull={partyFull}
        />
        {undoDeath.isError && (
          <Typography as="p" role="alert" variant="body" tone="alert">
            Could not bring the mon back: {undoDeath.error.message}. Nothing was saved.
          </Typography>
        )}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t-[1.5px] border-border p-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={undoDeath.isPending}>
          {undoDeath.isPending ? "Bringing back…" : "Bring back"}
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
