import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject } from 'rxjs';
import { usertype } from './model/usertype.model';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  usertypes = new BehaviorSubject<usertype[]>([]);
  usertypes$ = this.usertypes.asObservable();

  constructor(private httpClient: HttpClient, private apollo: Apollo) {
    this.getAllUserTypes().subscribe((data: any) => this.usertypes.next(data));
  }

  getAllUserTypes() {
    return this.httpClient.get('../assets/dummy/usertype.dummy.json');
  }

  getOneUser(_id: String) {
    const id = _id;
    return this.apollo.query({
      query: gql`
        query GetOneUser($id: ID) {
          getOneUser(data: { _id: $id }) {
            message
            data {
              credite
              email
              first_name
              last_name
              role
            }
          }
        }
      `,
      variables: { id },
      fetchPolicy: 'network-only',
    });
  }

  topupCredit(credite: number) {
    return this.apollo.mutate({
      mutation: gql`
        mutation TopUp($credite: Int) {
          TopUp(data: { credite: $credite }) {
            message
            data {
              email
              credite
              password
              last_name
              first_name
              role
              status
            }
          }
        }
      `,
      variables: { credite },
    });
  }
}
