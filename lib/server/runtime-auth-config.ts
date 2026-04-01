import { loginUsers } from "@/lib/data/seed";
import type { UserSummary } from "@/lib/types";

type RuntimeLoginUser = {
  username: string;
  password: string;
  user: UserSummary;
};

const isProduction = process.env.NODE_ENV === "production";

const normalizeEnvValue = (value?: string) => value?.trim() || undefined;

const resolveAllowDemoLogin = () => {
  const override = normalizeEnvValue(process.env.MINIBO_ALLOW_DEMO_LOGIN);

  if (override === "true") {
    return true;
  }

  if (override === "false") {
    return false;
  }

  return !isProduction;
};

const getSeedLoginUser = (username: string, fallbackIndex: number) =>
  loginUsers.find((item) => item.username === username) ?? loginUsers[fallbackIndex];

const buildRuntimeUser = (
  seedUser: (typeof loginUsers)[number],
  configuredUsername: string | undefined,
  configuredPassword: string | undefined,
  allowDemoLogin: boolean
): RuntimeLoginUser | null => {
  const username = configuredUsername ?? seedUser.username;
  const password = configuredPassword ?? (allowDemoLogin ? seedUser.password : undefined);

  if (!password) {
    return null;
  }

  return {
    username,
    password,
    user: {
      ...seedUser.user,
      username
    }
  };
};

export const getRuntimeLoginUsers = (): RuntimeLoginUser[] => {
  const allowDemoLogin = resolveAllowDemoLogin();
  const adminSeed = getSeedLoginUser("admin", 0);
  const supervisorSeed = getSeedLoginUser("supervisor", 1);

  return [
    buildRuntimeUser(
      adminSeed,
      normalizeEnvValue(process.env.MINIBO_ADMIN_USERNAME),
      normalizeEnvValue(process.env.MINIBO_ADMIN_PASSWORD),
      allowDemoLogin
    ),
    buildRuntimeUser(
      supervisorSeed,
      normalizeEnvValue(process.env.MINIBO_SUPERVISOR_USERNAME),
      normalizeEnvValue(process.env.MINIBO_SUPERVISOR_PASSWORD),
      allowDemoLogin
    )
  ].filter((item): item is RuntimeLoginUser => Boolean(item));
};

export const applyRuntimeUserOverrides = (users: UserSummary[]) => {
  const runtimeUsers = new Map(getRuntimeLoginUsers().map((item) => [item.user.id, item.user.username]));

  return users.map((user) => {
    const runtimeUsername = runtimeUsers.get(user.id);

    if (!runtimeUsername) {
      return user;
    }

    return {
      ...user,
      username: runtimeUsername
    };
  });
};
