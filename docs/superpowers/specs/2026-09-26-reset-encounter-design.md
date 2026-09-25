# Reset a wrongly logged encounter

Decided 2026-09-26. Linear PER-48.

## Why

There is no way to fix an encounter logged against the wrong species or with the wrong outcome,
and nothing removes an encounter. A misclick is permanent.

## Decision

One action, **Reset encounter**. It deletes the encounter and everything that hangs off it, which
means its mon and that mon's death if there is one. The route goes back to not encountered, and
the player logs it again correctly.

This covers all three gaps the ticket names: a wrong species, a wrong outcome, and an encounter
that should not exist. Fixing only the species means re-entering the mon's other details. A
species-only shortcut is a possible follow-up, not part of this.

## Behaviour

### The row

Tapping a caught or dead row opens the edit-mon dialog. Missed and skipped rows have no detail
view yet, so tapping them does nothing until PER-60 adds one. Not-encountered rows keep their Log
chip, and tapping the row logs it, the same as the chip.

The route name is a real button for keyboard and screen readers, named "Open {route name}" on a
caught or dead row and "Log {route name}" on a not-encountered row. The rest of the row is a
larger pointer target with the same handler, but is not itself focusable and carries no role.

Every route row gets one icon button at its end, in both the desktop table and the phone cards.

| Row | End icon |
|---|---|
| Caught, dead, missed or skipped | Reset, "Reset {route name}" |
| Not encountered, custom route with no encounter | Delete, "Delete {route name}" |
| Not encountered, open seeded route | none |

Reset and Delete never appear on the same row. Clicking the end icon or the Log chip does not
also trigger the row's open or log handler.

A "⋯" menu was tried and dropped: a row never needs more than one action besides opening, so a
menu just added a tap before the action that mattered.

### Confirming

Reset encounter opens a confirmation dialog that names what will be removed.

| Encounter | Message |
|---|---|
| Missed or skipped | "Reset {route}? It goes back to not encountered." |
| Caught, alive | "Reset {route}? This also deletes {mon}. This can't be undone." |
| Caught, dead | "Reset {route}? This also deletes {mon} and the record of its death. This can't be undone." |

- `{mon}` is the nickname and species when there is a nickname ("Sprig the Bellsprout"), and the
  species alone when there is not.
- For a death, the message names what killed it where the death records one. A trainer death with
  a `fightId` uses the fight's name ("…its death to Falkner"). A trainer death with a
  `trainerName` uses that name. Wild, status and other deaths say only "the record of its death".
- Buttons are Cancel and a destructive Reset encounter. Focus starts on Cancel.
- A storage failure shows the error in the dialog. Nothing is removed.

After a reset the route shows as not encountered with its Log chip. Party, boxes and graveyard
update because they are built from the same rows.

### Dead mons

Allowed. The confirmation says plainly that the death record goes too. A wrong encounter noticed
only after the mon died must still be fixable. Hardcore mode makes no difference: this corrects a
logging mistake, it does not undo a death in the game.

A fight the mon died in keeps its status. It has one fewer casualty.

## Data and code

### Domain

`planEncounterReset({ encounter, mon, deaths })` in `src/domain/transitions.ts`. `mon` is
`Mon | null` and `deaths` is `readonly Death[]`. It returns
`{ encounterId: string; monId: string | null; deathIds: string[] }`.

It throws when:

- the encounter is `open`
- the encounter has a `monId` but no mon was passed, or a mon was passed for an encounter with no
  `monId`
- the mon's `encounterId` is not the encounter's id
- a death's `monId` is not the mon's id

A mismatch means the data is already inconsistent. Deleting on a guess would make it worse.

### Storage

`useResetEncounter()` in `src/storage/mutations.ts`, taking `{ encounter: Encounter }`. Inside one
`adapter.transaction`:

1. Re-read the encounter by id, and throw if it no longer exists.
2. Read its mon by `encounter.monId` when set, and that mon's deaths with
   `deaths.where("monId", mon.id)`.
3. Plan with `planEncounterReset`.
4. Delete the deaths, then the mon, then the encounter.

A throw anywhere rolls back everything. On success it invalidates the run's queries, like the
other mutations.

Deleting the encounter row is what returns the route to not encountered. That is the state a
route has before anything is logged.

No schema change, no new index (`deaths.monId` is already indexed), no change to the export
format.

### UI

- `src/features/routes/row-end-action.tsx`: the end-of-row icon, Reset or Delete or nothing. It
  takes the row and callbacks and renders at most one icon.
- `src/features/routes/reset-encounter-dialog.tsx`: the confirmation. It builds its message from
  the encounter, mon, death and fight. Fight names come from `useFights(runId)`.
- `route-table.tsx` and `route-card-list.tsx` render the row's tap handler and name button, and
  place `RowEndAction` in the last column and after the badges.
- `routes-screen.tsx` holds the row being reset and shows the dialog, the same way it holds the
  mon being edited.

## Testing

- `planEncounterReset`: missed, skipped, caught alive, caught dead, each error case.
- `useResetEncounter` against the memory adapter with a seeded run:
  - Each case removes exactly the planned rows. Every other row in the run is untouched,
    including other routes' encounters, mons and deaths, and the fight.
  - Rollback: a delete that throws partway leaves the encounter and mon in place.
  - Party gap: resetting the mon in slot 2 of a full party, then catching into the party, gives
    the new mon slot 2.
- Row and end icon, in both layouts: tapping a caught or dead row opens edit, tapping a
  not-encountered row logs it, tapping a missed or skipped row does nothing, and Reset or Delete
  shows on the right row type and never both on the same row.
- Dialog: each message variant, Cancel writing nothing, Reset removing the rows and bringing back
  the Log chip, focus starting on Cancel, and a storage failure removing nothing.

Mutation probes, each of which must turn the suite red:

- the planner leaves out the death
- the planner accepts a mon from a different encounter
- the mutation deletes outside the transaction
- Cancel runs the reset
- the end icon offers Reset on a not-encountered row

## Delivery

One PR on PER-48, approved by Theo. Expected 750–900 lines, and it may pass 1000. If it does, the
PR says so at the top.

## Out of scope

- Changing a caught species in place
- An encounter view for missed and skipped routes (PER-60)
- Undoing a reset
