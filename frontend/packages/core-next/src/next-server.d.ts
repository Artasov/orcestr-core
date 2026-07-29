declare module "next/server.js" {
  export type NextRequest = {
    headers: {
      get(name: string): string | null;
    };
    nextUrl: {
      pathname: string;
      search: string;
      hash: string;
      origin: string;
    };
  };

  export class NextResponse {
    static redirect(url: URL): NextResponse;
  }
}
