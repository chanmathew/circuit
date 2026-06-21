import { Folder, Plus } from 'lucide-react'
import { useState } from 'react'

import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorSeparator,
  ModelSelectorTrigger,
  PromptInputButton,
} from '@circuit/ui'

import type { RepoDto } from '../../../../shared/api.js'

export interface ComposerProjectSelectorProps {
  repos: RepoDto[]
  repoId?: string
  disabled?: boolean
  onRepoChange?: (repoId: string) => void
  onAddRepo?: () => void
}

export function ComposerProjectSelector({
  repos,
  repoId,
  disabled = false,
  onRepoChange,
  onAddRepo,
}: ComposerProjectSelectorProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const selectedRepo = repos.find((repo) => repo.id === repoId)

  const handleSelect = (nextRepoId: string): void => {
    onRepoChange?.(nextRepoId)
    setOpen(false)
  }

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger asChild>
        <PromptInputButton
          type="button"
          disabled={disabled}
          tooltip="Select project"
        >
          <Folder className="size-4 shrink-0" />
          <ModelSelectorName>
            {selectedRepo?.name ?? 'Select project'}
          </ModelSelectorName>
        </PromptInputButton>
      </ModelSelectorTrigger>
      <ModelSelectorContent title="Select project">
        <ModelSelectorInput placeholder="Search projects…" />
        <ModelSelectorList>
          <ModelSelectorEmpty>No projects found.</ModelSelectorEmpty>
          <ModelSelectorGroup heading="Projects">
            {repos.map((repo) => (
              <ModelSelectorItem
                key={repo.id}
                value={repo.name}
                onSelect={() => handleSelect(repo.id)}
              >
                <Folder className="size-4 shrink-0 text-muted-foreground" />
                <ModelSelectorName>{repo.name}</ModelSelectorName>
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
          {onAddRepo ? (
            <>
              <ModelSelectorSeparator />
              <ModelSelectorGroup>
                <ModelSelectorItem value="Add project" onSelect={onAddRepo}>
                  <Plus className="size-4 shrink-0" />
                  <ModelSelectorName>Add project…</ModelSelectorName>
                </ModelSelectorItem>
              </ModelSelectorGroup>
            </>
          ) : null}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  )
}
