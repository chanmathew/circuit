const LAST_REPO_ID_KEY = 'circuit:lastRepoId'

export function readLastRepoId(): string | undefined {
  try {
    const value = localStorage.getItem(LAST_REPO_ID_KEY)
    return value && value.length > 0 ? value : undefined
  } catch {
    return undefined
  }
}

export function writeLastRepoId(repoId: string): void {
  try {
    localStorage.setItem(LAST_REPO_ID_KEY, repoId)
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

export function resolveRepoId(
  repos: { id: string }[],
  urlRepoId?: string,
): string | undefined {
  if (urlRepoId && repos.some((repo) => repo.id === urlRepoId)) {
    return urlRepoId
  }

  const stored = readLastRepoId()
  if (stored && repos.some((repo) => repo.id === stored)) {
    return stored
  }

  return repos[0]?.id
}
