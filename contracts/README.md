# API request contracts

`api-types.d.ts` is **generated** in `market-genius-api-typescript` from the Zod
schemas that `validateRequest` enforces, and copied here. Do not edit it.

To refresh it, from the API repo:

```
npm run contracts:build   # regenerate from schemas/*.schema.ts
npm run contracts:sync    # copy into this repo and the mobile app
```

## How it is used

Each request body is annotated with its contract type at the point it is built:

```ts
const payload: CreateFaqInput = { question, answer };
await api.post("/api/faq", payload);
```

That is the whole mechanism. Forms keep their own local zod schemas — the
messages a user sees while typing are a UI concern and have nothing to do with
what the server checks on submit — but they can no longer disagree with the
server about the *shape*. Before this they could, and the disagreement only
showed up as a 400 in production.

The types are fully expanded, so there is no dependency on zod, no path into
the API repo, and no build step: the file is plain structural TypeScript.

## What it does not cover

Requests only. Responses are not described by Zod anywhere in the API, so the
interfaces describing them are still hand-written here and can still drift.
That is the larger half of the problem and a separate piece of work.
