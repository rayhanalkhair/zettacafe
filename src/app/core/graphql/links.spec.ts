import { ApolloClient, ApolloLink, gql, InMemoryCache } from '@apollo/client';
import { of } from 'rxjs';
import { createAuthLink, createErrorLink } from './links';

const query = gql`
  query {
    me {
      id
    }
  }
`;

/** Runs one operation through `link` into `terminal`, swallowing the GraphQL error a failing terminal produces. */
async function run(
  link: ApolloLink,
  terminal: ApolloLink,
  context: Record<string, unknown> = {},
): Promise<void> {
  const client = new ApolloClient({
    link: ApolloLink.from([link, terminal]),
    cache: new InMemoryCache(),
  });
  await client.query({ query, context, fetchPolicy: 'no-cache' }).catch(() => undefined);
}

function recorder(): { link: ApolloLink; seen: () => Record<string, unknown> } {
  let context: Record<string, unknown> = {};
  const link = new ApolloLink((operation) => {
    context = operation.getContext();
    return of({ data: { me: null } });
  });
  return { link, seen: () => context };
}

describe('createAuthLink', () => {
  it('adds the bearer token from the store at request time', async () => {
    let token: string | null = null;
    const { link, seen } = recorder();
    const auth = createAuthLink(() => token);

    await run(auth, link);
    expect(seen()['headers']).toBeUndefined();

    token = 'tok_1';
    await run(auth, link);
    expect(seen()['headers']).toEqual({ authorization: 'Bearer tok_1' });
  });

  it('keeps other headers the caller set', async () => {
    const { link, seen } = recorder();
    await run(
      createAuthLink(() => 'tok_1'),
      link,
      { headers: { 'x-trace': 'abc' } },
    );
    expect(seen()['headers']).toEqual({ 'x-trace': 'abc', authorization: 'Bearer tok_1' });
  });

  // signOut ends the session it has already discarded locally.
  it('lets a caller-supplied Authorization header win over the store', async () => {
    const { link, seen } = recorder();
    await run(
      createAuthLink(() => 'store-token'),
      link,
      { headers: { authorization: 'Bearer explicit' } },
    );
    expect((seen()['headers'] as Record<string, string>)['authorization']).toBe('Bearer explicit');
  });
});

describe('createErrorLink', () => {
  const failing = (code: string): ApolloLink =>
    new ApolloLink(() =>
      of({
        data: null,
        errors: [{ message: 'no', extensions: { code } }],
      }),
    );

  it('ends the session when a signed-in user is rejected', async () => {
    const onSessionExpired = vi.fn();
    const link = createErrorLink({ isSignedIn: () => true, onSessionExpired });
    await run(link, failing('UNAUTHENTICATED'));
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a guest, or it would fire on every public page', async () => {
    const onSessionExpired = vi.fn();
    const link = createErrorLink({ isSignedIn: () => false, onSessionExpired });
    await run(link, failing('UNAUTHENTICATED'));
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('ignores every other error code', async () => {
    const onSessionExpired = vi.fn();
    const link = createErrorLink({ isSignedIn: () => true, onSessionExpired });
    await run(link, failing('INSUFFICIENT_CREDIT'));
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});
