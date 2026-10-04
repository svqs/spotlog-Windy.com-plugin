/** Read a UTF-8 request body without buffering more than the configured byte budget. */
export async function readTextLimited(request: Request, maxBytes: number): Promise<string | null> {
    const length = Number(request.headers.get('content-length'));
    if (Number.isFinite(length) && length > maxBytes) {return null;}
    if (!request.body) {return '';}
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) {break;}
            size += value.byteLength;
            if (size > maxBytes) {await reader.cancel(); return null;}
            chunks.push(value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        chunks.forEach(chunk => {bytes.set(chunk, offset); offset += chunk.byteLength;});
        return new TextDecoder().decode(bytes);
    } catch {return null;}
    finally {reader.releaseLock();}
}
