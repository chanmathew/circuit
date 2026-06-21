import { simpleGit } from 'simple-git'

export async function commitStaged(cwd: string, message: string): Promise<void> {
  const trimmed = message.trim()
  if (!trimmed) {
    throw new Error('Commit message is required')
  }

  const git = simpleGit(cwd)
  const status = await git.status()
  if (status.staged.length === 0) {
    throw new Error('No staged changes to commit')
  }

  await git.commit(trimmed)
}
