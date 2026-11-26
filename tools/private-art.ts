import { privateArtFailure, runPrivateArt } from '../src/private-art-cli.js'
try { runPrivateArt(process.argv.slice(2)) } catch (error) { console.error(privateArtFailure(error)); process.exitCode = 1 }
