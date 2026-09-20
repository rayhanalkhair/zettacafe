/**
 * Where to go after signing in. The `returnUrl` query parameter is attacker-controlled
 * (anyone can send a link to /login?returnUrl=...), so it is only honoured when it is
 * an in-app path. Anything else, including `//evil.example`, `https://evil.example`
 * and `/\evil.example` (which browsers treat as a protocol-relative URL), falls back
 * to the home page. This prevents an open redirect.
 */
export function safeReturnUrl(value: string | null | undefined): string {
  if (!value) return '/';
  if (!value.startsWith('/')) return '/';
  // "//host" and "/\host" are both read by browsers as a different origin.
  if (value.startsWith('//') || value.startsWith('/\\')) return '/';
  // Control characters can be used to smuggle past the checks above.
  if ([...value].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f)) return '/';
  // Never bounce back to a guest-only page: it would redirect again.
  if (/^\/(login|register|forgot-password)(?:[/?#]|$)/.test(value)) return '/';
  return value;
}
