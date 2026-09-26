/** Trigger a browser download for in-memory content. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so the download has started in all browsers.
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

export interface PickFileOptions {
  accept: string;
}

/**
 * Open the native file picker and resolve with the chosen file, or `null`
 * if the user cancelled. Works without any DOM element being mounted.
 */
export function pickFile({ accept }: PickFileOptions): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0] ?? null;
        input.remove();
        resolve(file);
      },
      { once: true },
    );
    input.addEventListener(
      'cancel',
      () => {
        input.remove();
        resolve(null);
      },
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
  });
}
