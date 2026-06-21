export function DashboardPage(): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Select a task</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Choose a task from the sidebar, or click New task and pick a project in the composer.
      </p>
    </div>
  )
}
