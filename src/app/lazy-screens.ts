import { lazy } from "react";

export const BoxesScreen = lazy(() =>
  import("@/features/boxes/boxes-screen").then((m) => ({ default: m.BoxesScreen })),
);
export const FightsScreen = lazy(() =>
  import("@/features/fights/fights-screen").then((m) => ({ default: m.FightsScreen })),
);
export const GraveyardScreen = lazy(() =>
  import("@/features/graveyard/graveyard-screen").then((m) => ({ default: m.GraveyardScreen })),
);
export const NewRunScreen = lazy(() =>
  import("@/features/new-run/new-run-screen").then((m) => ({ default: m.NewRunScreen })),
);
export const NotFoundScreen = lazy(() =>
  import("@/features/not-found/not-found-screen").then((m) => ({ default: m.NotFoundScreen })),
);
export const PartyScreen = lazy(() =>
  import("@/features/party/party-screen").then((m) => ({ default: m.PartyScreen })),
);
export const RoutesScreen = lazy(() =>
  import("@/features/routes/routes-screen").then((m) => ({ default: m.RoutesScreen })),
);
export const RunListScreen = lazy(() =>
  import("@/features/run-list/run-list-screen").then((m) => ({ default: m.RunListScreen })),
);
export const SettingsScreen = lazy(() =>
  import("@/features/settings/settings-screen").then((m) => ({ default: m.SettingsScreen })),
);
