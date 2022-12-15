import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  constructor(private apollo: Apollo) {}

  getAuthorization(value: any) {
    return this.apollo.mutate({
      mutation: gql`
        mutation Login($value: userParams) {
          Login(data: $value) {
            message
            token
            user {
              _id
              credite
              last_name
              role
              usertype {
                name
                slug
                view
              }
            }
          }
        }
      `,
      variables: { value },
    });
  }

  getVerificationCode(data: any) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation SaveVerification($data: userParams) {
            saveVerification(data: $data) {
              message
              data {
                email
                first_name
                last_name
                role
                credite
              }
            }
          }
        `,
        variables: { data },
      })
      .pipe(
        map((data: any) => {
          return data.data.saveVerification;
        })
      );
  }

  forgetPassword(data: any) {
    return this.apollo.mutate({
      mutation: gql`
        mutation ForgetPassword($data: userParams) {
          ForgetPassword(data: $data) {
            message
            data {
              first_name
              last_name
              credite
              password
              role
              email
              status
            }
          }
        }
      `,
      variables: { data },
      fetchPolicy: 'network-only',
    });
  }

  createUser(data: any) {
    return this.apollo.mutate({
      mutation: gql`
        mutation CreateUser($data: userParams) {
          CreateUser(data: $data) {
            message
            data {
              first_name
              last_name
              email
              password
              role
            }
          }
        }
      `,
      variables: { data },
      fetchPolicy: 'network-only',
    });
  }
}
