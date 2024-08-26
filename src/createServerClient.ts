import { createStorageFromOptions, applyServerStorage } from "./cookies";
import type { CookieOptionsWithName, CookieMethodsServer } from "./types";
import { SurgeClient, SurgeClientOptions } from "@entropi-co/surge-js";
import { VERSION } from "./version";

export function createServerClient(
  surgeUrl: string,
  options: SurgeClientOptions & {
    cookieOptions?: CookieOptionsWithName;
    cookies: CookieMethodsServer;
    cookieEncoding?: "raw" | "base64url";
  },
): SurgeClient {
  if (!surgeUrl) {
    throw new Error(
      `Failed to create Surge server client: missing surgeUrl parameter`,
    );
  }

  const { storage, getAll, setAll, setItems, removedItems } =
    createStorageFromOptions(
      {
        ...options,
        cookieEncoding: options?.cookieEncoding ?? "base64url",
      },
      true,
    );

  const client = new SurgeClient({
    url: surgeUrl,
    headers: {
      "X-Client-Info": `surge-ssr/${VERSION}`,
    },
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: true,
    storage: storage,
    flowType: "implicit",
  });

  client.onAuthStateChange(async (event) => {
    // The SIGNED_IN event is fired very often, but we don't need to
    // apply the storage each time it fires, only if there are changes
    // that need to be set -- which is if setItems / removeItems have
    // data.
    const hasStorageChanges =
      Object.keys(setItems).length > 0 || Object.keys(removedItems).length > 0;

    if (
      hasStorageChanges &&
      (event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED" ||
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_OUT" ||
        event === "MFA_CHALLENGE_VERIFIED")
    ) {
      await applyServerStorage(
        { getAll, setAll, setItems, removedItems },
        {
          cookieOptions: options?.cookieOptions ?? null,
          cookieEncoding: options?.cookieEncoding ?? "base64url",
        },
      );
    }
  });

  return client;
}
