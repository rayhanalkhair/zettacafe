/**
 * Build-time constants, substituted by the bundler's `define` option
 * (see angular.json: `true` by default, `false` in the production configuration).
 *
 * `define` replaces the identifier while the file is being parsed, so a dead
 * `DEV_TOOLS ? import('./x') : null` branch is removed BEFORE the chunk graph is
 * built and the dev chunk is never emitted. An exported constant does not do
 * this: the bundler inlines it too late and still emits an orphaned chunk.
 */
declare const DEV_TOOLS: boolean;
