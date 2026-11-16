type Deps = {
  /** A new token from the sign-in provider (Clerk), or null when the sign-in has ended. */
  freshToken: () => Promise<string | null>;
  save: (token: string) => void;
  signOut: () => void;
};

/**
 * Gets a new owner token after the server said the old one expired (Clerk's last about a minute).
 * Several owner screens poll at once, so when the token expires many calls fail together: they all
 * wait on the same request instead of each starting one.
 * An ended sign-in signs the owner out here too. Being offline doesn't: they can try again later.
 */
export function ownerRefresher(deps: Deps): () => Promise<boolean> {
  let running: Promise<boolean> | null = null;
  const attempt = async (): Promise<boolean> => {
    try {
      const token = await deps.freshToken();
      if (!token) {
        deps.signOut();
        return false;
      }
      deps.save(token);
      return true;
    } catch {
      return false;
    }
  };
  return () => {
    running ??= attempt().finally(() => {
      running = null;
    });
    return running;
  };
}
