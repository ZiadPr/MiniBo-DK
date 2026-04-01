import { jwtVerify, SignJWT } from "jose";
import { getRuntimeLoginUsers } from "@/lib/server/runtime-auth-config";

export const AUTH_COOKIE = "minibo_session";

export interface AuthSession {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
}

const getJwtSecret = () => {
  const configuredSecret = process.env.JWT_SECRET?.trim();

  if (configuredSecret) {
    return new TextEncoder().encode(configuredSecret);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be configured in production");
  }

  return new TextEncoder().encode("minibo-demo-secret");
};

export const authenticateUser = async (username: string, password: string): Promise<AuthSession | null> => {
  const user = getRuntimeLoginUsers().find((item) => item.username === username && item.password === password);
  if (!user) {
    return null;
  }

  return {
    userId: user.user.id,
    username: user.user.username,
    fullName: user.user.fullName,
    role: user.user.role,
    permissions: user.user.permissions
  };
};

export const createSessionToken = async (session: AuthSession) =>
  new SignJWT({ ...session } as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getJwtSecret());

export const verifySessionToken = async (token?: string) => {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as AuthSession;
  } catch {
    return null;
  }
};
