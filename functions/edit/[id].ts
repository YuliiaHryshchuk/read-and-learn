type FunctionContext = {
  request: Request;
  env: {
    ASSETS: {
      fetch: (request: Request) => Promise<Response>;
    };
  };
};

export function onRequestGet({ request, env }: FunctionContext) {
  const shellUrl = new URL(request.url);
  shellUrl.pathname = "/edit/material";
  shellUrl.search = "";

  return env.ASSETS.fetch(new Request(shellUrl, { method: "GET" }));
}
