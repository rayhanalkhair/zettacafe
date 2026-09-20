/** `.graphql` files are imported as text (see the `loader` option in angular.json). */
declare module '*.graphql' {
  const source: string;
  export default source;
}
