import { format } from 'date-fns'

import { datascriptQuery, getPageBlocks } from '../mcp'

const TYPE_TAGS = ['Source', 'Concept', 'Entity', 'Synthesis', 'Question']

const todayAsJournalDay = (): number => {
  const now = new Date()
  return Number(format(now, 'yyyyMMdd'))
}

const flattenTitles = (blocks: unknown[], depth = 0, max = 30): string => {
  const out: string[] = []
  let count = 0
  const walk = (bs: unknown[], d: number) => {
    for (const b of bs) {
      if (count >= max) return
      const block = b as { title?: string; children?: unknown[] }
      if (block.title) {
        out.push(`${'  '.repeat(d)}- ${block.title}`)
        count++
      }
      if (Array.isArray(block.children)) walk(block.children, d + 1)
    }
  }
  walk(blocks, depth)
  return out.join('\n')
}

export const buildSessionStartContext = async (): Promise<string> => {
  const lines: string[] = []

  // Type counts
  lines.push('## Type counts')
  for (const tag of TYPE_TAGS) {
    try {
      const r = await datascriptQuery<[number][]>(
        `[:find (count ?p) :where [?p :block/tags ?t] [?t :block/title "${tag}"]]`,
      )
      const count = r?.[0]?.[0] ?? 0
      lines.push(`- ${tag}: ${count}`)
    } catch (err) {
      lines.push(`- ${tag}: (query failed: ${String(err)})`)
    }
  }

  // Last 5 calendar days
  lines.push('\n## Last 5 calendar days')
  const today = todayAsJournalDay()
  try {
    const rows = await datascriptQuery<[string, number][]>(
      `[:find ?title ?day :where [?p :block/journal-day ?day] [?p :block/title ?title]]`,
    )
    const sorted = (rows ?? [])
      .filter(([, day]) => day <= today)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    const presentDays = new Set(sorted.map(([, d]) => d))

    // Walk back 5 calendar days from today; flag absent days
    for (let i = 0; i < 5; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayInt = Number(format(date, 'yyyyMMdd'))
      const match = sorted.find(([, d]) => d === dayInt)
      if (!match) {
        lines.push(`\n### ${format(date, 'yyyy-MM-dd')} (no journal)`)
        continue
      }
      const [title] = match
      lines.push(`\n### ${format(date, 'yyyy-MM-dd')} — ${title}`)
      try {
        const blocks = await getPageBlocks(title)
        const excerpt = flattenTitles(blocks, 0, 12)
        lines.push(excerpt || '(empty page)')
      } catch (err) {
        lines.push(`(failed to read: ${String(err)})`)
      }
    }
    // any presentDays not already rendered are older than 5 calendar days — ignore
    void presentDays
  } catch (err) {
    lines.push(`(journal query failed: ${String(err)})`)
  }

  return lines.join('\n')
}
