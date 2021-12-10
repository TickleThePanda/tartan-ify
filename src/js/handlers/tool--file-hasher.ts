
export async function hashFile(pcm: ArrayBuffer): Promise<string> {

  const copy = new ArrayBuffer(pcm.byteLength);
  new Uint8Array(copy).set(new Uint8Array(pcm));

  const hashBuffer = await crypto.subtle.digest("SHA-1", copy);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hash;
}
