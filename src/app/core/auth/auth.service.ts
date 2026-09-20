import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import {
  MeDocument,
  RequestPasswordResetDocument,
  ResetPasswordDocument,
  SignInDocument,
  SignOutDocument,
  SignUpDocument,
  TopUpCreditDocument,
  type RequestPasswordResetMutation,
  type SignInMutationVariables,
  type SignUpMutationVariables,
} from '@core/graphql/generated/operations';
import { SessionStore } from './session.store';

/**
 * Talks to the server about identity and keeps SessionStore in step with it.
 *
 * Every method either resolves with the result or rejects with the GraphQL error
 * (see toUserMessage); it never swallows a failure. On success it updates the
 * store, so components read state from the store and never assign it themselves.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apollo = inject(Apollo);
  private readonly session = inject(SessionStore);

  async signIn(input: SignInMutationVariables['input']): Promise<void> {
    const result = await this.apollo.client.mutate({
      mutation: SignInDocument,
      variables: { input },
      errorPolicy: 'none',
    });
    const payload = result.data?.signIn;
    // The schema makes AuthPayload non-null, so a missing payload is a broken
    // response, not a failed login. Never store anything in that case.
    if (!payload) throw new Error('The server returned no session.');
    this.session.signIn({ token: payload.token, user: payload.user });
  }

  /** Registering signs the new customer in. */
  async signUp(input: SignUpMutationVariables['input']): Promise<void> {
    const result = await this.apollo.client.mutate({
      mutation: SignUpDocument,
      variables: { input },
      errorPolicy: 'none',
    });
    const payload = result.data?.signUp;
    if (!payload) throw new Error('The server returned no session.');
    this.session.signIn({ token: payload.token, user: payload.user });
  }

  /**
   * Signs out locally first, so the UI never lingers in a signed-in state waiting
   * on the network, then tells the server to end the session. A server failure
   * here is deliberately ignored: the local session is already gone.
   */
  async signOut(): Promise<void> {
    const token = this.session.token();
    this.session.signOut();
    if (!token) return;
    try {
      await this.apollo.client.mutate({
        mutation: SignOutDocument,
        context: { headers: { authorization: `Bearer ${token}` } },
      });
    } catch {
      // The token is already discarded on this device.
    }
    await this.apollo.client.clearStore();
  }

  /**
   * Re-validates a restored session against the server and refreshes the user
   * (credit changes while the tab is closed). An expired or revoked token signs
   * the user out. Does nothing for a guest, so a first visit never loads the server.
   */
  async refresh(): Promise<void> {
    if (!this.session.isAuthenticated()) return;
    try {
      const result = await this.apollo.client.query({
        query: MeDocument,
        fetchPolicy: 'network-only',
        errorPolicy: 'none',
      });
      const user = result.data?.me;
      if (user) this.session.patchUser(user);
      else this.session.signOut();
    } catch {
      // A transient failure (offline, server not reachable) keeps the local session;
      // an UNAUTHENTICATED response is handled by the error link.
    }
  }

  async topUp(amountIdr: number): Promise<void> {
    const result = await this.apollo.client.mutate({
      mutation: TopUpCreditDocument,
      variables: { amountIdr },
      errorPolicy: 'none',
    });
    const user = result.data?.topUpCredit;
    if (user) this.session.patchUser(user);
  }

  async requestPasswordReset(
    email: string,
  ): Promise<RequestPasswordResetMutation['requestPasswordReset']> {
    const result = await this.apollo.client.mutate({
      mutation: RequestPasswordResetDocument,
      variables: { email },
      errorPolicy: 'none',
    });
    if (!result.data) throw new Error('The server returned no response.');
    return result.data.requestPasswordReset;
  }

  async resetPassword(input: { email: string; code: string; newPassword: string }): Promise<void> {
    await this.apollo.client.mutate({
      mutation: ResetPasswordDocument,
      variables: { input },
      errorPolicy: 'none',
    });
  }
}
