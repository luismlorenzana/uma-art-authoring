// Owner-operated on the Mac only. AI agents may run synthetic tests, never this command on owner data.
import { fileURLToPath } from 'node:url'
import { privateArtFailure } from '../src/private-art-cli.js'
import { fail } from '../src/private-art.js'
import { prepareOwnerPackage } from '../src/private-art-owner.js'

try {
  const args = process.argv.slice(2)
  const value = (name: string) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] && !args[i + 1]!.startsWith('--') ? args[i + 1]! : fail('MISSING_OWNER_OPTION') }
  if (process.platform !== 'darwin' || !args.includes('--owner-run')) fail('OWNER_MAC_ONLY')
  const result = prepareOwnerPackage({ planFile: value('--plan'), sourceRoot: value('--source-root'), ownerRoot: value('--owner-root'), approvalsFile: value('--approvals'), outbox: value('--out'), repoRoot: fileURLToPath(new URL('..', import.meta.url)) })
  console.log(JSON.stringify(result))
} catch (error) { console.error(privateArtFailure(error)); process.exitCode = 1 }
