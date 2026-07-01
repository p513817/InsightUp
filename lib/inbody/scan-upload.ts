const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_MULTIPART_BODY_OVERHEAD_BYTES = 256 * 1024;

export function isOversizedScanUpload(contentLengthHeader: string | null) {
  if (!contentLengthHeader) {
    return false;
  }

  const contentLength = Number(contentLengthHeader);

  if (!Number.isFinite(contentLength) || contentLength < 0) {
    return false;
  }

  return contentLength > MAX_UPLOAD_SIZE_BYTES + MAX_MULTIPART_BODY_OVERHEAD_BYTES;
}

export { MAX_UPLOAD_SIZE_BYTES };
