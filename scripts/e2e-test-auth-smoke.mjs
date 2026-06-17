import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_BASE_URL = "http://localhost:5500";
const DEFAULT_SCENARIO = "dashboard-rich";
const DEFAULT_PERSONA = "alice";
const DEFAULT_FRIEND_CODE = "E2EBOB001A";
const DEFAULT_RETRIES = 3;

function parseArgs(argv) {
  const values = {};

  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      values[match[1]] = match[2];
    }
  }

  return values;
}

function parseEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const rawValue = line.slice(index + 1).trim();
        const value = rawValue.replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }

  const header = response.headers.get("set-cookie");
  return header ? [header] : [];
}

async function postJson(url, secret, body) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-e2e-test-auth-secret": secret,
    },
    method: "POST",
    redirect: "manual",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}: ${payload.message || response.statusText}`);
  }

  return { payload, response };
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function postJsonWithRetry(url, secret, body, retries = DEFAULT_RETRIES) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await postJson(url, secret, body);
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }

      console.warn(`Attempt ${attempt} failed for ${url}. Retrying...`);
      await sleep(attempt * 1000);
    }
  }

  throw lastError;
}

async function postAppJson(url, cookies, body) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      cookie: cookies.map((cookie) => cookie.split(";")[0]).join("; "),
      "content-type": "application/json",
    },
    method: "POST",
    redirect: "manual",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}: ${payload.message || response.statusText}`);
  }

  return payload;
}

const args = parseArgs(process.argv.slice(2));
const envFile = parseEnvFile(resolve(".env.local"));
const env = { ...envFile, ...process.env };

const baseUrl = args.baseUrl || env.E2E_TEST_AUTH_BASE_URL || DEFAULT_BASE_URL;
const scenario = args.scenario || DEFAULT_SCENARIO;
const persona = args.persona || DEFAULT_PERSONA;
const shouldAssertFriendAdd = args.assertFriendAdd === "true";
const secret = env.E2E_TEST_AUTH_SECRET;

if (env.E2E_TEST_AUTH_ENABLED !== "true") {
  throw new Error("E2E_TEST_AUTH_ENABLED must be true in .env.local.");
}

if (!secret) {
  throw new Error("E2E_TEST_AUTH_SECRET is missing.");
}

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. Fill .env.local before running this smoke test.");
}

console.log(`Resetting ${scenario} at ${baseUrl}...`);
await postJsonWithRetry(`${baseUrl}/api/test-auth/reset`, secret, { scenario });

console.log(`Logging in as ${persona}...`);
const { response, payload } = await postJsonWithRetry(`${baseUrl}/api/test-auth/login`, secret, {
  next: "/dashboard",
  persona,
});

const cookies = getSetCookieHeaders(response);
const hasSupabaseCookie = cookies.some((cookie) => cookie.includes("sb-"));

if (!hasSupabaseCookie) {
  throw new Error("Login succeeded, but no Supabase auth cookie was set on the response.");
}

console.log(`OK: ${payload.persona?.email || persona} can log in and received Supabase auth cookies.`);

if (shouldAssertFriendAdd) {
  if (scenario !== "friend-add-flow" || persona !== "alice") {
    throw new Error("--assertFriendAdd=true requires --scenario=friend-add-flow --persona=alice.");
  }

  console.log(`Adding friend ${DEFAULT_FRIEND_CODE} as ${persona}...`);
  const friendPayload = await postAppJson(`${baseUrl}/api/friends`, cookies, {
    friendCode: DEFAULT_FRIEND_CODE,
  });

  if (friendPayload.friend?.friendCode !== DEFAULT_FRIEND_CODE) {
    throw new Error("Friend add response did not include the expected Bob friend code.");
  }

  console.log(`OK: ${persona} can add friend ${DEFAULT_FRIEND_CODE}.`);
}
