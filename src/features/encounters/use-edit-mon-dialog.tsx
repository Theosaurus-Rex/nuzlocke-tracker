import { useState, type ReactNode } from "react";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Mon, Route } from "@/domain/types";
import { useRun } from "@/storage/queries";

import { EditMonDialog } from "./edit-mon-dialog";

export function useEditMonDialog(
  runId: string,
  mons: readonly Mon[],
  routes: readonly Route[],
): { openEditor: (monId: string) => void; dialog: ReactNode } {
  const [editingMonId, setEditingMonId] = useState<string | null>(null);
  const runQuery = useRun(runId);
  const mon = mons.find((candidate) => candidate.id === editingMonId);
  const route = routes.find((candidate) => candidate.id === mon?.caughtRouteId) ?? null;

  const dialog =
    mon === undefined ? null : (
      <EditMonDialog
        open
        onOpenChange={(open) => {
          if (!open) setEditingMonId(null);
        }}
        route={route}
        mon={mon}
        rules={runQuery.data?.rules ?? DEFAULT_RULES}
      />
    );

  return { openEditor: setEditingMonId, dialog };
}
