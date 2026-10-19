# Read & Learn

Read texts in the language you are learning without constantly looking up every
unfamiliar word. Add a text, review focused explanations and translations, and
then read the original without breaking your flow.

## Run locally with Docker

### Requirements

- Docker Desktop with Docker Compose;
- an internet connection for Puter authentication and AI requests;
- a Puter account when you want to generate or save a text.

### Start the project

1. Clone or unpack the project.
2. Open a terminal in the cloned project directory.
3. Run:

   ```sh
   docker compose up --build
   ```

4. Wait until the logs contain:

   ```text
   next-1     | Ready
   pages-1    | Ready on http://0.0.0.0:8788
   ```

5. Open http://localhost:3000.

The command automatically:

- installs the container dependencies;
- applies all pending migrations to the local Cloudflare D1 database;
- starts the Next.js development server with Hot Module Replacement (HMR);
- starts the Cloudflare Pages runtime, API functions, and local D1 database;
- starts a local Caddy gateway on port 3000.

Caddy sends `/api/*` requests to the Cloudflare Pages runtime and application
pages to the Next.js development server. Saved-material and editor URLs are
internally mapped to their statically generated shells while the real material
ID remains in the browser URL. Caddy and this routing are used only for local
development; they are not included in the production deployment.

The first build can take a few minutes. Later launches can use the same command;
Docker will reuse cached image layers when the dependencies have not changed.

### Preview the production build

To verify the actual static export without the development server, stop Docker
Compose and run:

```sh
pnpm preview:pages
```

This command builds the static site into `out` and serves it together with the
Pages Functions and local D1 database through Wrangler. Unlike the Docker
development stack, this mode does not provide HMR; rebuild after making changes.
The production Cloudflare Pages deployment uses the same static `out` directory.

### Local data

Saved texts are stored in the local D1 database under the project's `.wrangler`
directory. They remain available after the container is restarted. Each copy of
the project has its own local database and does not share texts with other
computers.

### Stop the project

Press `Ctrl+C` in the terminal running Docker Compose, or run this command from
another terminal in the project directory:

```sh
docker compose down
```

Stopping the containers does not delete the local D1 data.

## Tests

The default test suite is fully offline: Puter and HTTP calls are mocked.

```sh
pnpm test
pnpm test:coverage
```

Tests that make real Puter requests must be named `*.puter.test.ts` (or
`*.puter.test.tsx`). They are excluded from the normal suite and run only with:

```sh
pnpm test:puter
```

## Git workflow

Install the repository's local Git hooks after cloning:

```sh
pnpm hooks:install
```

The pre-push hook blocks direct pushes to `main`. Push a feature branch and
merge it through a GitHub pull request instead. Git hooks are a local safeguard:
`git push --no-verify` skips the local hook but does not bypass the server-side
GitHub rules that protect `main`.
