export type Opaque<T, Token extends string> = T & {
  readonly __opaque: Token;
};
