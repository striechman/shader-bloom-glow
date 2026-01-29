export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';

  // Some browsers (notably iOS Safari) can ignore download on blob URLs.
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  setTimeout(() => URL.revokeObjectURL(url), 500);
}
