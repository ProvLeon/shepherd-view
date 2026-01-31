import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/seed')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/seed"!</div>
}
