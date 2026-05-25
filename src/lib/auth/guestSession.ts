import { cookies } from "next/headers";

export const GUEST_SESSION_COOKIE = "guestSession";

export async function getGuestSessionId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_SESSION_COOKIE)?.value;
}

export async function setGuestSessionCookie(guestSessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_SESSION_COOKIE, guestSessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function generateGuestSessionId() {
  return crypto.randomUUID();
}
