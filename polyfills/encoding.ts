const g: any = globalThis as any;

// Patch Buffer encodings only if Buffer exists in this runtime (React Native provides a global Buffer).
const GlobalBuffer: any = g.Buffer;

if (GlobalBuffer) {
  // Treat 'latin1' as an alias of 'binary' to avoid Unknown encoding errors.
  const originalIsEncoding = GlobalBuffer.isEncoding?.bind(GlobalBuffer);
  GlobalBuffer.isEncoding = function (encoding: string): boolean {
    if (!encoding) return false;
    const lowered = String(encoding).toLowerCase();
    if (lowered === 'latin1') {
      return true;
    }
    return originalIsEncoding ? originalIsEncoding(encoding) : false;
  };

  const originalWrite = GlobalBuffer.prototype.write;
  if (originalWrite) {
    GlobalBuffer.prototype.write = function (
      string: string,
      encoding?: BufferEncoding,
      ...rest: any[]
    ) {
      const enc = encoding && encoding.toLowerCase() === 'latin1' ? 'binary' : encoding;
      // @ts-ignore - runtime encoding mapping
      return originalWrite.call(this, string, enc, ...rest);
    };
  }

  const originalToString = GlobalBuffer.prototype.toString;
  if (originalToString) {
    GlobalBuffer.prototype.toString = function (
      encoding?: BufferEncoding,
      ...rest: any[]
    ) {
      const enc = encoding && encoding.toLowerCase() === 'latin1' ? 'binary' : encoding;
      // @ts-ignore - runtime encoding mapping
      return originalToString.call(this, enc, ...rest);
    };
  }
}

// If something constructs TextDecoder('latin1'), map it to utf-8 instead of throwing.
const NativeTextDecoder = g.TextDecoder;
if (typeof NativeTextDecoder === 'function') {
  const PatchedTextDecoder = function (this: any, label?: string, options?: any) {
    const mappedLabel =
      label && typeof label === 'string' && label.toLowerCase() === 'latin1'
        ? 'utf-8'
        : label;
    // @ts-ignore
    return new NativeTextDecoder(mappedLabel, options);
  } as any;

  PatchedTextDecoder.prototype = NativeTextDecoder.prototype;
  g.TextDecoder = PatchedTextDecoder;
}

