export type D1Value = string | number | null;

export type D1PreparedStatement = {
  bind: (...values: D1Value[]) => D1PreparedStatement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results: T[] }>;
};

export type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
};

export type FunctionContext<Params = Record<string, string>> = {
  request: Request;
  env: {
    DB: D1Database;
  };
  params: Params;
};
