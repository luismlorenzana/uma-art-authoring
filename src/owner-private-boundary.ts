/** This guard also applies after resolving links, so normal galleries cannot preview owner-only files. */
export const ownerPrivatePath = (path: string) => path.split(/[\\/]/).some(part =>
  /^(?:private|owner-private|owner-only|private-variants|private-art-outbox|secrets)$/i.test(part) || /\.private\./i.test(part))
