import { LangDict } from './default'

// Intentionally empty. The scaffold shipped translations keyed by index, and our
// strings changed what each index means, so keeping them would have mistranslated
// rather than left a gap. Machine-translating consensus-adjacent UI text is worse
// than showing English. Falls back to DEFAULT_LANG until a translator fills these.
export default {} as Record<string, LangDict>
