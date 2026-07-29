export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };
export type ErrorParams = Readonly<Record<string, JsonPrimitive>>;
export type FieldPathPart = string | number;

export type ApiFieldError<TCode extends string = string> = {
  path: readonly FieldPathPart[];
  code: TCode;
  message?: string;
  params?: ErrorParams;
};

export type ApiErrorPayload<
  TCode extends string = string,
  TFieldCode extends string = string,
> = {
  code: TCode;
  message: string;
  params?: ErrorParams;
  fields?: readonly ApiFieldError<TFieldCode>[];
  details?: JsonObject;
  request_id?: string;
};

export type ApiErrorEnvelope<
  TCode extends string = string,
  TFieldCode extends string = string,
> = {
  error: ApiErrorPayload<TCode, TFieldCode>;
};

