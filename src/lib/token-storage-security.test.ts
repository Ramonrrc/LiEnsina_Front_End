import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) return sourceFiles(path)
    if (!/\.(ts|tsx)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) return []
    return [path]
  })
}

describe('token storage security', () => {
  it('does not persist sensitive tokens in browser storage', () => {
    const srcDir = join(process.cwd(), 'src')
    const storageWritePattern = /\b(?:localStorage|sessionStorage)\s*\.\s*setItem\s*\([^)]*(?:token|authorization|bearer|jwt)/i
    const offenders = sourceFiles(srcDir).filter((path) => storageWritePattern.test(readFileSync(path, 'utf8')))

    expect(offenders).toEqual([])
  })
})
