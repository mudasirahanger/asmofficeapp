import type { Page, Route } from '@playwright/test';

/**
 * Realistic API mocks for e2e tests run WITHOUT a live Laravel backend.
 *
 * These shapes are taken directly from the actual backend response code
 * (backend/app/Http/Controllers/Api/*.php), not guessed, so a shape drift
 * between frontend and backend would still show up as a frontend crash
 * here even though the network layer is faked. This does NOT replace
 * testing against a real backend — see mobile/e2e/auth.spec.ts and
 * dashboard.spec.ts, which are written for a live API + `expo start --web`
 * dev server, and README/TEST_REPORT.md for how to run those for real.
 */

export const FOUNDER_USER = {
  id: 1,
  name: 'Mudasir Ahanger',
  username: 'mudasir',
  role: 'founder',
  departments: [{ id: 1, name: 'Engineering' }],
};

export const ACTIVE_PROJECT = {
  id: 101,
  title: 'OfficeHub Audit Fixes',
  description: 'Production readiness pass',
  client: 'Internal',
  department_id: 1,
  assigned_to: 1,
  sub_assigned_to: null,
  created_by: 1,
  deadline: '2026-08-15',
  priority: 'high',
  status: 'in_progress',
  notes: null as string | null,
  completed_at: null as string | null,
  billed_at: null as string | null,
  server_version: 1,
  created_at: '2026-07-01T00:00:00.000000Z',
  updated_at: '2026-07-20T00:00:00.000000Z',
  department: { id: 1, name: 'Engineering', color: 'blue' }, // must be a real DEPT_COLORS key
  assignedTo: { id: 1, name: 'Mudasir Ahanger' },
  subAssignedTo: null,
  createdBy: { id: 1, name: 'Mudasir Ahanger' },
  progressUpdates: [{ id: 1, percentage: 40, text: 'In progress', created_at: '2026-07-20T00:00:00.000000Z' }],
};

export const CLIENT_SUMMARIES = [
  {
    id: 201,
    name: 'Internal',
    total_projects: 1,
    active_projects: 1,
    completed_projects: 0,
    billed_projects: 0,
    overdue_projects: 0,
    last_activity: '2026-07-20T00:00:00.000000Z',
  },
  {
    id: 202,
    name: 'Unlinked Co',
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    billed_projects: 0,
    overdue_projects: 0,
    last_activity: null as string | null,
  },
];

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/**
 * Installs route mocks for every endpoint the app calls on the
 * login -> dashboard -> project-detail -> mark-complete path. Call this
 * BEFORE page.goto().
 */
export async function mockCoreApi(page: Page, opts: { loginShouldFail?: boolean } = {}) {
  await page.route('**/api/login', async (route) => {
    if (opts.loginShouldFail) {
      await json(route, { message: 'Invalid username or password.', errors: { username: ['Invalid username or password.'] } }, 422);
      return;
    }
    await json(route, { token: 'e2e-test-token', user: FOUNDER_USER });
  });

  await page.route('**/api/me', (route) => json(route, { user: FOUNDER_USER }));

  await page.route('**/api/dashboard', (route) =>
    json(route, {
      stats: { active_projects: 1, overdue_projects: 0, completed_this_month: 3 },
      department_overview: [],
      active_projects: [ACTIVE_PROJECT],
      overdue_projects: [],
    })
  );

  await page.route('**/api/notifications', (route) => json(route, { notifications: [], unread_count: 0 }));
  await page.route('**/api/notifications/read-all', (route) => json(route, { message: 'ok' }));

  // TeamController@users / @departments (backend/app/Http/Controllers/Api/TeamController.php)
  // return response()->json($collection) directly — a BARE array, not
  // { users: [...] }. teamService.ts wraps it into { users: [...] } /
  // { departments: [...] } client-side. Mocking these as already-wrapped
  // objects (an earlier version of this mock did) caused a real crash to
  // surface here (`users.find is not a function`, because `users` ended up
  // being `{ users: [...] }` instead of `[...]`) — that was this mock
  // being wrong, not an app bug, but it's exactly the kind of
  // frontend/backend shape mismatch this suite exists to catch, so the
  // shapes below are deliberately kept matched to the real controller.
  await page.route('**/api/users', (route) => json(route, [FOUNDER_USER]));
  await page.route('**/api/departments', (route) => json(route, [{ id: 1, name: 'Engineering' }]));

  // ClientController (backend/app/Http/Controllers/Api/ClientController.php)
  // — full CRUD, stateful across requests within a test so a
  // rename/delete's cache-invalidated refetch shows the real effect.
  let clientsState = CLIENT_SUMMARIES.map((c) => ({ ...c }));
  let nextClientId = 900;

  await page.route(/\/api\/clients(\/\d+)?$/, (route) => {
    const method = route.request().method();
    const idMatch = route.request().url().match(/\/api\/clients\/(\d+)/);
    const id = idMatch ? Number(idMatch[1]) : null;

    if (method === 'GET') {
      return json(route, { clients: clientsState });
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON();
      const newClient = {
        id: ++nextClientId,
        name: body.name,
        total_projects: 0, active_projects: 0, completed_projects: 0, billed_projects: 0, overdue_projects: 0,
        last_activity: null,
      };
      clientsState.push(newClient);
      return json(route, { client: newClient }, 201);
    }
    if (method === 'PUT' && id != null) {
      const body = route.request().postDataJSON();
      clientsState = clientsState.map((c) => (c.id === id ? { ...c, name: body.name } : c));
      return json(route, { client: clientsState.find((c) => c.id === id) });
    }
    if (method === 'DELETE' && id != null) {
      const client = clientsState.find((c) => c.id === id);
      // Mirrors ClientController@destroy: refuse if any project references it.
      if (client && client.total_projects > 0) {
        return json(route, { message: 'This client is linked to one or more projects and cannot be deleted.' }, 409);
      }
      clientsState = clientsState.filter((c) => c.id !== id);
      return json(route, { message: 'Client deleted.' });
    }
    return json(route, { message: `Unhandled ${method} in e2e mock` }, 500);
  });

  // Regex, not a glob string: the Projects list screen calls this with
  // ?status=&dept=&search= query params (e.g. when arriving pre-filtered
  // from the Clients screen), and a plain '**/api/projects' glob does not
  // match a URL with a trailing query string. The `$` anchor after the
  // optional query also keeps this from accidentally shadowing
  // /api/projects/{id} routes registered below.
  await page.route(/\/api\/projects(\?[^/]*)?$/, (route) => {
    if (route.request().method() === 'GET') {
      // ProjectController@index returns ProjectResource::collection() over a
      // paginated query — Laravel's AnonymousResourceCollection wraps that as
      // { data: [...], links: {...}, meta: {...} }, not a bare
      // { projects: [...] }. mobile/app/(drawer)/projects/index.tsx reads
      // `data?.data`, so this mock must match that shape or the list screen
      // silently renders empty (see PRODUCTION_AUDIT.md D-19, found via this
      // exact mismatch).
      return json(route, {
        data: [ACTIVE_PROJECT],
        links: { first: null, last: null, prev: null, next: null },
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      });
    }
    return route.continue();
  });

  // Minimal server-side state so that a GET after PATCH .../complete
  // reflects the change — proves the mutation's cache-invalidated refetch
  // actually shows the new state in the UI, not just that a request fired.
  let projectState = { ...ACTIVE_PROJECT };

  // Single handler for /api/projects/{id} covering every method the app
  // might call against it, so there's no ambiguity about handler chaining.
  await page.route(`**/api/projects/${ACTIVE_PROJECT.id}`, (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      return json(route, {
        project: projectState,
        progress: projectState.progressUpdates,
        overdue: false,
        progress_percentage: 40,
      });
    }
    if (method === 'PUT') {
      // If "Mark Complete" ever regresses to calling this instead of the
      // dedicated /complete endpoint (PRODUCTION_AUDIT.md D-14), match the
      // real backend's actual behavior for a non-Founder/Head update
      // instead of silently succeeding, so the regression is visible.
      return json(route, { message: 'Unauthorized' }, 403);
    }
    return json(route, { message: `Unhandled method ${method} in e2e mock` }, 500);
  });

  // The endpoint the "Mark Complete" action MUST call (PRODUCTION_AUDIT.md
  // D-14 — it previously called PUT /projects/{id} with an invalid `status`
  // field instead of this dedicated endpoint). Tests assert this route was
  // actually hit, not just that *some* request succeeded.
  await page.route(`**/api/projects/${ACTIVE_PROJECT.id}/complete`, (route) => {
    projectState = { ...projectState, status: 'completed', completed_at: '2026-07-23T12:00:00.000000Z' };
    return json(route, projectState);
  });
}
