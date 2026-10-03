# Study Reader

Learn languages through adapted texts, translations, and focused explanations.

## Run locally with Docker

### Requirements

- Docker Desktop with Docker Compose;
- an internet connection for Puter authentication and AI requests;
- a Puter account when you want to generate or save a text.

### Start the project

1. Clone or unpack the project.
2. Open a terminal in the `study-reader-web` directory.
3. Run:

   ```sh
   docker compose up --build
   ```

4. Wait until the logs contain:

   ```text
   Ready on http://0.0.0.0:3000
   ```

5. Open http://localhost:3000.

The command automatically:

- installs the container dependencies;
- applies all pending migrations to the local Cloudflare D1 database;
- starts the Cloudflare Pages runtime and API functions;
- starts the Next.js development server with automatic browser reloads.

The first build can take a few minutes. Later launches can use the same command;
Docker will reuse cached image layers when the dependencies have not changed.

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
