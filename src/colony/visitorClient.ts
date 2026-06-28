// Public visitor self-service client — no Bearer token required.
// These paths must remain token-free; do NOT add auth headers here.

const BASE = "/kooker/api/v1/citylife/visitor";

async function post<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = null;
  try {
    data = await resp.json();
  } catch {
    /* no body */
  }
  if (!resp.ok) {
    const msg: string =
      data?.message || data?.error || `Request failed (${resp.status})`;
    const err = new Error(msg) as Error & { status: number };
    err.status = resp.status;
    throw err;
  }
  return data as T;
}

export interface SignupResult {
  userId: number;
  status: string;
}
export interface RedeemResult {
  userId: number;
  active: boolean;
}

/** Register a new CityLife visitor. Account is DISABLED until an operator issues an unlock code. */
export async function signupVisitor(
  email: string,
  password: string,
  username: string,
): Promise<SignupResult> {
  return post<SignupResult>("/signup", { email, password, username });
}

/** Redeem an operator-issued unlock code to activate the visitor account. */
export async function redeemUnlockCode(
  email: string,
  code: string,
): Promise<RedeemResult> {
  return post<RedeemResult>("/unlock", { email, code });
}
