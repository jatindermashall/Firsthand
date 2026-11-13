export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const fail = (status: number, code: string, message: string): never => { throw new HttpError(status, code, message); };
export const notFound = (what = "Not found") => fail(404, "not_found", what);
