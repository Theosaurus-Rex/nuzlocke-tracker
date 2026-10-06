/**
 * `appRoutes` is separate from `router` so tests build a `createMemoryRouter` from the same
 * route objects. `createBrowserRouter` assumes a real origin. Swap in `createHashRouter` if
 * Capacitor's `file://` origin ever needs it.
 */

import { createBrowserRouter, type RouteObject } from "react-router";

import {
  BoxesScreen,
  FightsScreen,
  GraveyardScreen,
  NewRunScreen,
  NotFoundScreen,
  PartyScreen,
  RoutesScreen,
  RunListScreen,
  SettingsScreen,
} from "./lazy-screens";
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
