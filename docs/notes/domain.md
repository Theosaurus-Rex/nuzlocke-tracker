# Domain notes

Reasoning that's too long for an inline comment, linked from the code it explains.

## Why `dead` comes from `mons`, not `deaths`

`summariseRun` derives `party`, `boxed` and `dead` all from `countByMonStatus(mons)`, never
`dead` from `deaths.length`. They agree under every transition today, but `backup.ts` only
checks that a death's `monId` references a mon, not that mon's status, and hand-edited data is
supported. Deriving `dead` from `mons` keeps the three a true partition regardless of how a
`deaths` row got there. See the partition test in `derive.test.ts` before changing this.
