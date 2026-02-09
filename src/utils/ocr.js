export async function ocrImageToText(file) {
    if (!file) throw new Error('No image provided');

    const mime = file.type || '';

    if (!mime.startsWith('image/')) {
        throw new Error('File must be an image');
    }

    const { createWorker } = await import('tesseract.js');

    const worker = await createWorker('eng');

    try {
        const { data } = await worker.recognize(file);
        return (data?.text || '').trim();
    } finally {
        await worker.terminate();
    }
}
