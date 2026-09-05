/**
 * Tell TypeScript that `ViewTransition` and `addTransitionType` exist.
 *
 * They do exist at runtime — Next bundles its own canary build of React and
 * aliases `react` to it, so `import { ViewTransition } from "react"` resolves
 * to something real. But `@types/react` keeps canary-only APIs in a separate
 * `canary.d.ts` that nothing references by default, so without this file the
 * import typechecks as an error even though the app runs fine.
 *
 * It goes here rather than in `next-env.d.ts`, which says at the top of itself
 * that it should not be edited: Next rewrites that file on every build and any
 * hand-added line disappears the next time you run `next dev`.
 *
 * `tsconfig.json` already includes every `.ts` file in the project, so no
 * config change is needed — dropping the file in is enough.
 */
/// <reference types="react/canary" />
