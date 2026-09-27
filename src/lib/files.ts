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

/** Largest photo accepted for placing (bytes). */
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/** Read a file as a base64 data URL. */
export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Could not read file'));
    };
    reader.readAsDataURL(file);
  });
}

/** Pixel size of an image given as a URL. */
export function imageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      reject(new Error('Not a readable image'));
    };
    image.src = src;
  });
}
