import type { IssueRecommendation } from './types'

export function timeAgo(iso?: string) {
  if (!iso) return 'unknown'
  const d = (Date.now() - new Date(iso).getTime()) / 86400000
  if (d < 1) return 'today'
  if (d < 2) return 'yesterday'
  if (d < 30) return `${Math.floor(d)}d ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

export interface Warning { level: 'error' | 'warn' | 'info'; text: string }

export function issueWarnings(i: IssueRecommendation): Warning[] {
  const w: Warning[] = []
  if (i.state !== 'open') w.push({ level: 'error', text: i.state === 'closed' ? 'This issue is closed.' : 'The issue state is unknown.' })
  if (i.assigned) w.push({ level: 'warn', text: 'This issue appears to be assigned to someone.' })
  if (i.linkedPullRequest) w.push({ level: 'warn', text: 'A linked pull request may already address this issue.' })
  if (i.repoSignals?.hasContributing === false) w.push({ level: 'warn', text: 'No contribution guide was detected. Ask maintainers before starting.' })
  const d = (Date.now() - new Date(i.updatedAt).getTime()) / 86400000
  if (d > 90) w.push({ level: 'warn', text: `Stale: last updated ${Math.floor(d / 30)} months ago.` })
  const unknown = [i.assigned === undefined && 'assignment', i.linkedPullRequest === undefined && 'linked pull requests', i.repoSignals?.hasContributing === undefined && 'contribution guide'].filter(Boolean)
  if (unknown.length) w.push({ level: 'info', text: `Unknown (not confirmed either way): ${unknown.join(', ')}.` })
  return w
}

export const LANGUAGES = ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java', 'C#', 'C++', 'Ruby', 'PHP', 'Kotlin', 'Swift', 'CSS', 'HTML']
export const FRAMEWORKS = ['React', 'Next.js', 'Vue', 'Svelte', 'Node.js', 'Express', 'Django', 'FastAPI', 'Jest', 'pytest', 'Tailwind', 'Docker', 'GraphQL', 'REST APIs', 'Accessibility', 'CLI', 'OpenAPI', 'Markdown']
export const TASK_TYPES = ['Bug fix', 'Feature', 'Documentation', 'Tests', 'Refactor', 'Performance', 'Accessibility']
export const TOPICS = ['Developer tools', 'Web', 'Data', 'Systems', 'Design systems', 'Education', 'DevOps', 'AI / ML']
