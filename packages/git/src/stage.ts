import { simpleGit } from 'simple-git'

export async function stageFiles(cwd: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await simpleGit(cwd).add(paths)
}

export async function unstageFiles(cwd: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await simpleGit(cwd).reset(['HEAD', '--', ...paths])
}
