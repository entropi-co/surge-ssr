import { VERSION } from "./version";
import { isBrowser } from "./utils";

import type { CookieMethodsBrowser, CookieOptionsWithName } from "./types";

import { createStorageFromOptions } from "./cookies";
import { SurgeClient, SurgeClientOptions } from "@entropi-co/surge-js";

let cachedBrowserClient: SurgeClient | undefined;

export function createBrowserClient(
  surgeUrl: string,
  options?: SurgeClientOptions & {
    cookies?: CookieMethodsBrowser;
    cookieOptions?: CookieOptionsWithName;
    cookieEncoding?: "raw" | "base64url";
    isSingleton?: boolean;
  },
): SurgeClient {
  // singleton client is created only if isSingleton is set to true, or if isSingleton is not defined and we detect a browser
  const shouldUseSingleton =
    options?.isSingleton === true ||
    ((!options || !("isSingleton" in options)) && isBrowser());

  if (shouldUseSingleton && cachedBrowserClient) {
    return cachedBrowserClient;
  }

  if (!surgeUrl) {
    throw new Error(
      `Failed to create Surge browser client: missing surgeUrl parameter`,
    );
  }

  const { storage } = createStorageFromOptions(
    {
      ...options,
      cookieEncoding: options?.cookieEncoding ?? "base64url",
    },
    false,
  );

  const client = new SurgeClient({
    ...options,
    url: surgeUrl,
    headers: {
      "X-Client-Info": `surge-ssr/${VERSION}`,
    },
    ...(options?.cookieOptions?.name
      ? { storageKey: options.cookieOptions.name }
      : null),
    flowType: "implicit",
    autoRefreshToken: isBrowser(),
    detectSessionInUrl: isBrowser(),
    persistSession: true,
    storage: storage,
  });

  if (shouldUseSingleton) {
    cachedBrowserClient = client;
  }

  return client;
}
