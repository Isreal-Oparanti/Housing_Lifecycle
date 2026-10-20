import type { AuthorityRate, LookupResponse, Pence, Sourced } from "@truecost/core";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

const UNREACHABLE = "We couldn't reach TrueCost. Check your connection and try again.";

async function getJson(path: string, signal?: AbortSignal): Promise<{ ok: boolean; body: unknown }> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(UNREACHABLE);
  }
  const body = await response.json().catch(() => null);
  return { ok: response.ok, body };
}

/** Never rejects for "postcode not found"-style answers; those come back as statuses to show the renter. */
export async function lookup(query: string, authority: string | undefined, signal: AbortSignal): Promise<LookupResponse> {
  const params = new URLSearchParams({ q: query });
  if (authority) params.set("authority", authority);
  const { body } = await getJson(`/api/lookup?${params}`, signal);
  const status = (body as { status?: unknown } | null)?.status;
  if (typeof status === "string" && status !== "error") return body as LookupResponse;
  throw new Error((body as { message?: string } | null)?.message ?? UNREACHABLE);
}

export interface AuthorityDetail {
  taxYear: string;
  authority: AuthorityRate;
  bandD: Sourced<Pence>;
}

export async function getAuthority(gssCode: string, signal?: AbortSignal): Promise<AuthorityDetail> {
  const { ok, body } = await getJson(`/api/council-tax/authorities/${gssCode}`, signal);
  if (!ok) throw new Error(UNREACHABLE);
  return body as AuthorityDetail;
}
