# Read & Learn — a web application for reading with the Frank method

Start date: September 17, 2026

Last updated: October 10, 2026

## 1. Project goals

Read & Learn helps users study and save learning texts.

The user should be able to:

- enter or paste source text manually;
- choose the language for translations and explanations;
- receive an adaptation based on the Frank method: source fragments, translations, and useful explanations;
- save the completed material to a personal library;
- open the material later without making another AI request, then read, edit, or delete it;
- in an additional flow, select or photograph an image containing text, recognize the text, and transfer it to the regular material creation form.

OCR is a method of entering text, not a separate material type. After recognition, the same flow applies as after manual input.

## 2. Permanent product rules

### 2.1. Languages

- The application interface and all controls are written in English.
- The current learning flow accepts Spanish source text; the source language is currently set by the `Spanish` constant.
- The source language and the translation and explanation language are separate parameters and are stored separately.
- The user chooses the translation and explanation language; there is currently no separate source-language selection in the main text flow.
- The translation and all explanatory text must be written entirely in the selected target language.
- An example in the AI instruction is used only when its language matches the selected target language.

### 2.2. Adaptation format

The application divides the source text into fragments and assigns IDs to them. The model returns only the translation and explanation for each known ID. The source text is never taken from the model response.

```json
{
  "fragment-1": {
    "translation": "...",
    "explanation": "term — explanation\nterm — explanation"
  }
}
```

Response requirements:

- every requested ID is present exactly once;
- unknown IDs and fields are prohibited;
- `translation` and `explanation` are strings;
- the structure is validated at runtime before it is displayed or saved;
- an invalid response is not treated as a successful adaptation;
- the AI response is displayed only as escaped text and is not passed to `dangerouslySetInnerHTML`, `eval`, SQL, operating-system commands, URLs, or file names.

### 2.3. Source-text segmentation

- A word is a non-empty sequence of characters between spaces or line boundaries.
- A target fragment contains between 5 and 50 words and ends with a complete sentence whenever possible.
- If adding the next sentence would exceed 50 words, the boundary is placed after the previous sentence.
- A sentence longer than 50 words is forcibly divided into blocks of no more than 50 words.
- A short remainder is joined or redistributed whenever possible without exceeding the limit.
- `Intl.Segmenter` is not used for this purpose.

### 2.4. Explanation requirements

- An explanation contains information beyond the full translation: non-obvious meanings, expressions, grammar in context, pronoun references, and likely typos.
- A straightforward dictionary translation of an obvious word is not considered an explanation by itself.
- For a finite verb form, the infinitive, tense, mood, person, and number are provided.
- For an infinitive, gerund, or participle, the corresponding non-finite form is identified without inventing a tense or person.

### 2.5. Input limits

- The user may continue typing after 300 words, but the text cannot be submitted for generation or saved until the excess is corrected.
- The primary hard limit for source text is 3,000 characters.
- The interface must clearly explain when a limit is exceeded instead of silently rejecting the action.
- Text obtained through OCR is subject to the same limits.

### 2.6. Material display

- Each fragment shows the unchanged source excerpt and allows the translation and explanation to be expanded independently.
- When a result is opened for the first time, the first fragment is expanded and the remaining fragments are collapsed.
- In an expanded fragment, the explanation is open and the translation is initially hidden.
- Actions are available to expand or collapse all fragments.
- The source excerpt and translation are shown in full; a long explanation may have internal scrolling.
- The interface must work fully on desktop and mobile.

## 3. Permanent technical and organizational decisions

### 3.1. Core stack

| Area                  | Decision                                                 |
| --------------------- | -------------------------------------------------------- |
| Development language  | TypeScript                                               |
| UI                    | React and Next.js                                        |
| Styles                | SCSS and SCSS Modules                                    |
| AI                    | Puter AI, `gpt-5.4-mini` via `azure-openai-responses`    |
| Authentication        | Puter                                                    |
| Local development     | Docker Compose, Next.js dev, and local D1                |
| Tests                 | Vitest; live Puter checks are performed separately by hand |

A separate Python service and a custom model are not planned for the current scope.

### 3.2. Why Puter was chosen

Puter was selected not only as a way to call an AI model, but also as part of the project's financial and user architecture.

- AI requests use the allowance or purchased credits of the user's own Puter account. The owner of Read & Learn does not need to pay for every user's tokens through a shared API account.
- The application does not need to create its own billing system: accept payments for AI requests, track balances, allocate limits, or block overspending.
- Read & Learn does not store the user's payment data and does not assume the related security and sensitive-information processing requirements.
- Limits and spending are isolated at the individual Puter account level. One user cannot exhaust the application's shared budget or affect access for other users.
- Puter also provides registration, sign-in, and user sessions. This avoids the need to develop a separate account system, password recovery, and authentication credential storage.

Read & Learn remains responsible for clearly handling Puter errors: missing authentication, exhausted allowance or credits, a required paid plan, rate limits, and temporary provider unavailability.

### 3.3. Docker and local development

- Docker Compose remains a supported method for local startup and for handing the project over to other developers.
- The current Compose project is named `read-and-learn` and starts one web container.
- The container applies local D1 migrations, starts the Cloudflare Pages runtime, and proxies the Next.js development server.
- The application is available at `http://localhost:3000`.
- Local D1 data is persisted in `.wrangler`.
- The pinned Wrangler version supports the current proxy-dev flow; the warning about future removal of proxy mode remains a reason to revisit local startup later.

### 3.4. Git and documentation

- Commit names and descriptions are written in English.
- Direct pushes to `main` are protected by a version-controlled `pre-push` hook; an emergency bypass is possible with `--no-verify`.
- Architectural decisions are recorded in this document by date so that historical state is not mixed with the current state.

## 4. Security and permanent risks

### 4.1. Puter and user data

- The Puter token is a secret. It is transmitted only over HTTPS in `Authorization`, is not stored in the database, is not included in URLs, and must not appear in logs.
- The backend does not trust a username, email address, or owner supplied by the browser. Material ownership is determined only after validating the token and obtaining a stable `puter_user_uuid`.
- Signing out must clear authentication state and the application's local user data.
- The source text and AI instruction are sent to Puter and the selected external model provider. This must be disclosed in the privacy policy before public release.
- Model availability, pricing, allowance, and Puter restrictions may change; fixed values are not hard-coded into the UI.
- The real Puter login popup, SDK loading, and AI request are not covered by regular unit tests and require a manual smoke test.

### 4.2. Prompt injection and untrusted content

- All user text is treated as untrusted data. Instructions within it must be translated and explained, not executed.
- The system instruction and source text are sent to the model separately.
- The AI request is not given tools, web search, code execution, access to D1, the file system, or secrets.
- The application creates fragment IDs itself and validates an exact response match.
- Security relies not only on the prompt, but also on the model having no technical ability to perform actions with side effects.

### 4.3. Client and infrastructure

- XSS may lead to theft of the Puter token, so unsafe HTML insertion is prohibited and third-party dependencies must be controlled.
- A strict CSP and security headers remain a separate task: the policy must not break the embedded Next.js scripts of the static export or the Puter login popup.
- Cloudflare, Puter, or the external AI provider may be temporarily unavailable. An error must not cause the entered text to be lost or be presented as a successful adaptation.
- Cloudflare availability may vary by region; this must be considered when choosing the target audience and a backup hosting option.
- Rate limits, quotas, and privacy-conscious monitoring still require separate decisions.

## 5. Project state as of September 27, 2026

### 5.1. Status

The working prototype could already accept Spanish text, send a structured request through Puter AI, validate the response, and display the adaptation. Material storage, the library, and backend integration had not yet been implemented.

### 5.2. Architecture as of this date

```text
Browser: React / Next.js
       |
       +---- Puter Auth
       |
       +---- Puter AI ---- gpt-5.4-mini / azure-openai-responses

Planned storage:
Cloudflare Pages Functions ---- Cloudflare D1
```

The `puter.ai.chat()` call was made directly in the browser. It used `reasoning_effort: "minimal"`, `normalize: true`, and structured output through `text.format` with JSON Schema. `max_tokens` was not specified explicitly. Puter Test mode was processed through the same path as a regular response.

### 5.3. Decisions made

#### Why the Cloudflare architecture was chosen

PostgreSQL was initially considered for material storage, and AWS infrastructure was considered for hosting the application. The proposed setup with a separate application server and managed PostgreSQL would have required several infrastructure components and could have created recurring expenses even with a small number of users.

When selecting production infrastructure, one of the primary constraints was avoiding mandatory recurring expenses during the project's early stage. An analysis of common reliable hosting platforms showed that free plans are usually suitable only for static websites. The Cloudflare Pages free plan additionally allows Pages Functions to run without a separate permanently running server, while D1 provides storage compatible with this serverless model. This makes it possible to host a static Next.js export and retain the necessary server-side operations within one infrastructure.

The architecture was therefore changed as follows:

- the interface is built as a static website and hosted on Cloudflare Pages;
- dynamic protected operations are performed through Pages Functions;
- materials are stored in D1;
- PostgreSQL, Prisma, a separate application server, and AWS were removed from the current production stack;
- the infrastructure scales with actual usage and does not create mandatory expenses for permanently running resources at the current stage of the project.

This decision reduces cost and operational complexity while preserving the necessary server boundary for Puter token validation and secure access to user materials.

#### Other decisions

- Switch Next.js to static export mode and publish through Cloudflare Pages.
- Keep Docker Compose as the local environment, but do not use Docker for production hosting.
- Use Cloudflare Pages Functions for protected library operations.
- Use Cloudflare D1 instead of the initially considered PostgreSQL, Prisma, and custom Next.js backend.
- Validate the Puter token in the Function and use the confirmed `puter_user_uuid` as the record owner.
- Do not store the Puter token in the database or logs.
- Do not give the browser direct access to D1.
- Store the completed structured adaptation so that reopening it does not create another AI request.
- Apply production D1 migrations with a separate Wrangler command until safe automation is introduced.

### 5.4. Completed by this date

- [x] Implemented the main flow: text input → Puter login when required → generation → validation → display.
- [x] Implemented deterministic text segmentation and result matching by ID.
- [x] Added runtime validation of structured output.
- [x] Implemented expandable fragments with independent translation and explanation controls.
- [x] Added processing states and basic Puter error messages.
- [x] Selected the target Cloudflare Pages + Functions + D1 architecture.
- [x] Retained Docker as the primary method for local startup.

### 5.5. Next tasks as of this date

- [ ] Implement the D1 schema, Functions, and protected library.
- [ ] Add saving, reopening, editing, and deleting materials.
- [ ] Add user selection of the translation and explanation language.
- [ ] Separate preview and production databases.
- [ ] Configure CI, production smoke tests, and the Cloudflare deployment flow.
- [ ] Add unit tests and perform an architectural refactoring of the form.
- [ ] Improve the mobile layout.
- [ ] Investigate file and image upload after the core MVP.

## 6. Project state as of October 10, 2026

### 6.1. Status

The primary end-to-end flow has been implemented: the user authenticates through Puter, creates an adaptation, saves it to a personal library, reopens it, edits it, and deletes the material. The application is published through Cloudflare Pages, data is stored in D1, and CI and production smoke tests are operational.

The image text input flow has been prepared at the UI and file-validation level. Tesseract.js was evaluated but rejected because of insufficient recognition quality on real photographs. A new OCR engine has not yet been selected.

### 6.2. Current architecture

```text
Browser: static Next.js / React
       |
       +---- Puter Auth ---- user session
       |
       +---- Puter AI ----- gpt-5.4-mini / azure-openai-responses
       |                    translations and explanations
       |
       +---- /api/materials ---- Cloudflare Pages Functions
                                  |
                                  +---- Puter token validation
                                  |
                                  +---- Cloudflare D1

OCR: local browser-only feature module; engine not selected
```

- The production UI is a static Next.js export. There is no permanently running Next.js server.
- Puter handles authentication and AI generation.
- Pages Functions are the only gateway to D1.
- `GET /api/materials` returns only `id`, `title`, and the first 320 Unicode characters of the source text.
- The complete record is loaded through a separate `GET /api/materials/:id` request with `cache: "no-store"`.
- Preview and production use separate D1 databases.
- Cloudflare Pages Git integration starts a production deployment after changes to `main`.
- GitHub Actions runs CI and production smoke tests. Production D1 migrations are still run manually through Wrangler.
- The OCR image exists only in the tab's memory and is not sent to Pages Functions, Puter AI, D1, or localStorage.

### 6.3. Decisions made

#### Library and navigation

- A complete material record is never passed from the list as the data source for the reader: opening a material always performs a detail request.
- A regular link is used to navigate to the reader because the Cloudflare Function supplies the static shell for the dynamic route.
- After a new unsaved generation, internal navigation, Back, and Logout are protected by a dialog. Closing or reloading the tab uses the browser's system confirmation.
- A loaded saved material without regeneration is not considered unsaved.

#### UI and mobile

- Page height is determined by CSS flex layout, not `ResizeObserver`, `window.innerHeight`, or JavaScript calculations.
- `100dvh` is used with a `100vh` fallback; a long result expands the page and pushes the footer down.
- The mobile/desktop layout breakpoint is 720 px.
- Layout conflicts are not resolved with new `!important` declarations; component layout resides in CSS Modules.
- The shared footer is placed in the root layout.

#### OCR

- OCR is fully isolated in `app/new-text/_features/image-ocr`; the dialog is loaded lazily.
- The wizard is divided into steps: image selection → language selection → recognition/result.
- The dialog is full-screen on mobile and closes only through explicit controls, not Escape or the backdrop.
- One JPEG/JPG/PNG image up to 10 MB is accepted.
- The extension, MIME type, and content signature are validated. An error does not remove a previously selected valid image.
- `Take a photo` is shown only on a mobile device determined by more than viewport width alone. The rear camera is requested, but the final choice between camera and gallery is controlled by the mobile browser.
- OCR uses a separate dropdown. English and Russian have been prepared; the list can be expanded.
- If the textarea is empty, the final action is named `Use this text`. If text already exists, `Replace current text` and `Add to current text` are available.
- After recognition starts, the third step should open immediately with circular progress and a cancel icon inside it; pause/resume is not required.
- Tesseract.js worked entirely locally at a technical level: the npm package, worker, WASM, and English/Russian models did not use a CDN.
- Tesseract.js quality was insufficient for the project's goal: the user should be able to photograph text and receive a result accurate enough for subsequent AI explanations.
- Tesseract.js was removed from runtime code, dependencies, tests, logs, and local OCR resources. The UI shell was retained, and starting recognition was temporarily disabled.

### 6.4. Completed by this date

#### Product and data

- [x] Implemented Cloudflare D1 and protected Pages Functions.
- [x] Implemented saving, the library list, reading, editing, and deleting materials.
- [x] Materials are isolated by confirmed Puter UUID.
- [x] Source and target languages are stored separately; target-language selection was added to the UI.
- [x] `adaptation_json` is versioned.
- [x] The library list payload was reduced; the detail page always loads the complete record separately.
- [x] The truncated-text preview receives an ellipsis only when actual truncation occurs.

#### Architecture and quality

- [x] Zustand storage is isolated and cleared by Puter UUID.
- [x] A single Puter auth provider was created.
- [x] `NewTextForm` was divided into components.
- [x] The Puter AI adapter/config, API client/error parser, and shared Pages Functions helpers were extracted.
- [x] The raw AI fallback was removed from production.
- [x] Local-state debounce and the outdated-result state were added.
- [x] Metadata and dark theme were corrected.
- [x] Vitest and unit tests were added; the Puter logic surrounding the external service is covered by mock tests.
- [x] JavaScript height measurement was replaced with CSS layout.
- [x] Unsaved-generation protection was implemented.

#### UI and infrastructure

- [x] Mobile adaptation of the main screens, navigation, reading, and editing was completed.
- [x] Shared loading states without flickering login blocks were added.
- [x] A shared footer was added.
- [x] CI and production smoke tests were configured.
- [x] A manual smoke run checks the latest successful production deployment; a push to `main` checks the deployment for the corresponding commit SHA.
- [x] Preview and production were separated into different D1 databases.
- [x] Docker Compose was restored and verified with local D1 at `http://localhost:3000`.
- [x] A `pre-push` hook was added to prevent accidental pushes to `main`.

#### OCR

- [x] Added a launcher, responsive dialog, drag-and-drop, file picker, and mobile camera action.
- [x] Implemented secure validation of one JPEG/JPG/PNG image up to 10 MB.
- [x] Divided the wizard into independent components.
- [x] Added a separate OCR-language selection dropdown.
- [x] Evaluated Tesseract.js locally without a CDN.
- [x] Recorded that its quality does not meet the project's goal.
- [x] Completely removed Tesseract.js and related resources; retained the neutral UI shell.

### 6.5. Next tasks

#### OCR

- [ ] Select an OCR engine with acceptable quality on real photographs, not only clean scans.
- [ ] Evaluate candidates on a set of photographs with different lighting, tilt, fonts, and camera quality.
- [ ] After selecting an engine, restore the third step: progress, cancellation, an editable result, and the `Text could not be recognized` state.
- [ ] Connect the `Use this text`, `Replace current text`, and `Add to current text` actions to shared limit validation.

#### Quality and security

- [ ] Improve the remaining empty/loading/error/success states.
- [ ] Conduct Lighthouse, mobile, and axe audits.
- [ ] Investigate and implement security headers and a strict CSP without breaking the static export or Puter login popup.
- [ ] Add an optional manual or live smoke suite for a real Puter login and AI request.
- [ ] Define rate limits and quotas.
- [ ] Add privacy-conscious Web Vitals and error monitoring.

#### Scaling and operations

- [ ] Add cursor pagination after the library grows.
- [ ] Check the need for an extended D1 index using `EXPLAIN QUERY PLAN`.
- [ ] Consider SWR only when additional requests and a need for cache invalidation appear.
- [ ] Automate production D1 migrations only after choosing a safe deployment and recovery procedure.
- [ ] Modernize the local Wrangler flow before the currently supported proxy mode is removed.
