import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "pixelplus_admin_session";

export function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error("Missing ADMIN_USERNAME or ADMIN_PASSWORD");
  }

  return { username, password };
}

export async function isAdminLoggedIn() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);
  return session?.value === "authenticated";
}

export async function requireAdmin() {
  const loggedIn = await isAdminLoggedIn();

  if (!loggedIn) {
    throw new Error("UNAUTHORIZED");
  }
}

export const adminCookieName = ADMIN_COOKIE_NAME;
