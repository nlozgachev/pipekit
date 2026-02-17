import { NonEmptyList } from "../Types/NonEmptyList.ts";

export type WithKind<K extends string> = { readonly kind: K };

export type WithValue<T> = { readonly value: T };

export type WithError<T> = { readonly error: T };

export type WithErrors<T> = { readonly errors: NonEmptyList<T> };
