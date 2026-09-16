/**
 * Route table (spec §9). `appRoutes` is exported separately from `router` so tests can build a
 * `createMemoryRouter` from the exact same route objects instead of duplicating the tree.
 *
 * `createBrowserRouter` assumes path-based routing against a real origin. Capacitor's `file://`
 * origin at M6 may need `createHashRouter` instead — that is a one-line swap of this call, since
 * nothing in `AppShell` or the screens below assumes path routing (they only use `NavLink`,
 * `Outlet`, `Navigate` and `useParams`, all of which work the same under either router).
 */

import { createBrowserRouter, type RouteObject } from "react-router";

import { BoxesScreen } from "@/features/boxes/boxes-screen";
import { FightsScreen } from "@/features/fights/fights-screen";
import { GraveyardScreen } from "@/features/graveyard/graveyard-screen";
import { NewRunScreen } from "@/features/new-run/new-run-screen";
import { NotFoundScreen } from "@/features/not-found/not-found-screen";
import { PartyScreen } from "@/features/party/party-screen";
import { RoutesScreen } from "@/features/routes/routes-screen";
import { RunListScreen } from "@/features/run-list/run-list-screen";
import { SettingsScreen } from "@/features/settings/settings-screen";

import { AppShell } from "./app-shell";
import { RunRedirect } from "./run-redirect";

export const appRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <RunListScreen /> },
      { path: "runs/new", element: <NewRunScreen /> },
      { path: "runs/:runId", element: <RunRedirect /> },
      { path: "runs/:runId/routes", element: <RoutesScreen /> },
      { path: "runs/:runId/party", element: <PartyScreen /> },
      { path: "runs/:runId/boxes", element: <BoxesScreen /> },
      { path: "runs/:runId/graveyard", element: <GraveyardScreen /> },
      { path: "runs/:runId/fights", element: <FightsScreen /> },
      { path: "settings", element: <SettingsScreen /> },
      { path: "*", element: <NotFoundScreen /> },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
