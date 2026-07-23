import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { test } from 'node:test'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const generatedDir = path.join(root, 'docs/card-rules/generated')

function generatedSnapshot() {
  return Object.fromEntries(fs.readdirSync(generatedDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => [name, fs.readFileSync(path.join(generatedDir, name), 'utf8')]))
}

test('valid card-rules registries validate and generate deterministically', () => {
  const firstCrossRegistry = execFileSync(process.execPath, ['scripts/validate-card-rules-cross-registry.mjs'], { cwd: root, encoding: 'utf8' })
  const first = execFileSync(process.execPath, ['scripts/validate-card-rules.mjs'], { cwd: root, encoding: 'utf8' })
  const firstGenerated = generatedSnapshot()
  const secondCrossRegistry = execFileSync(process.execPath, ['scripts/validate-card-rules-cross-registry.mjs'], { cwd: root, encoding: 'utf8' })
  const second = execFileSync(process.execPath, ['scripts/validate-card-rules.mjs'], { cwd: root, encoding: 'utf8' })
  const secondGenerated = generatedSnapshot()
  const checkGenerated = execFileSync(process.execPath, ['scripts/validate-card-rules.mjs', '--check-generated'], { cwd: root, encoding: 'utf8' })

  assert.match(first, /Правила карточек валидны/)
  assert.match(firstCrossRegistry, /Cross-registry связи валидны/)
  assert.equal(secondCrossRegistry, firstCrossRegistry)
  assert.equal(second, first)
  assert.deepEqual(secondGenerated, firstGenerated)
  assert.match(checkGenerated, /Правила карточек валидны/)
})
