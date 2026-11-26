import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const allowedRoot = new Set(['.gitignore', 'README.md', 'AGENTS.md', 'CLAUDE.md', 'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'docs/private-art-variants.md',
  'paths.mjs', 'workspace.mjs', 'hub.mjs', 'docs/authoring/farm-life-splash-art/beach-spec.json', 'docs/farm-life-publishing.md', 'docs/farm-life-expressions.md', 'docs/duo-splash-authoring.md', 'docs/farm-character-sprites.md', 'docs/original-character-authoring.md', 'check-private.mjs', '.github/workflows/ci.yml', '.claude/launch.json',
  // Owner-authorized original, character-free scene studies are listed individually.
  'docs/authoring/farm-life-splash-art/interior-scenes.md',
  'assets/farm-life/scene-studies/v001/fireplace-sofa.png',
  'assets/farm-life/scene-studies/v001/bedroom.png',
  'assets/farm-life/scene-studies/v002/solo-armchair.png',
  'assets/farm-life/scene-studies/v002/dual-armchairs.png',
  'assets/farm-life/scene-studies/v003/bedroom.png'])
const source = /^(?:src|albums|publishing|quest|farm|cyberpunk|tools)\/(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.(?:m?js|ts|css|html)$/
const forbidden = /(?:^|\/)(?:content|references|drafts|reviews|prompts|owner-private|owner-only|private-variants|private-art-outbox|secrets|node_modules|\.cache|dist|coverage)(?:\/|$)|\.private\.|\.(?:key|pem)$/i
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
const unexpected = tracked.filter(file => forbidden.test(file) || (!allowedRoot.has(file) && !source.test(file)))
if (unexpected.length) {
  console.error('The Git index includes files outside the authoring code allowlist:')
  for (const file of unexpected) console.error('  ' + file)
  process.exitCode = 1
}
