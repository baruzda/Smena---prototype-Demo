import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')

test('valid card-rules registries validate and generate deterministically', () => {
  const first = execFileSync(process.execPath, ['scripts/validate-card-rules.mjs'], { cwd: root, encoding: 'utf8' })
  const second = execFileSync(process.execPath, ['scripts/validate-card-rules.mjs'], { cwd: root, encoding: 'utf8' })

  assert.match(first, /Правила карточек валидны/)
  assert.equal(second, first)
})
