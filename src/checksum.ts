// A deliberately non-cryptographic integrity check for exported progress
// files (Phase 4). The goal isn't to stop a determined attacker — it's a
// speed bump against the obvious "download the file, bump percentCorrect to
// 1.0 in a text editor, re-import it" move, which is exactly the kind of
// cheat this app's target audience would try. Anyone reading the bundled JS
// can still forge a valid checksum; that's an accepted tradeoff for a fully
// static, no-server app.
export function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
