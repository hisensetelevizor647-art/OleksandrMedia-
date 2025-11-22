import { put, del } from '@vercel/blob';

export interface UploadResult {
    url: string;
    pathname: string;
}

export async function uploadFile(
    file: File | Buffer,
    pathname: string,
    contentType?: string
): Promise<UploadResult> {
    const blob = await put(pathname, file, {
        access: 'public',
        addRandomSuffix: false,
        contentType: contentType || (file instanceof File ? file.type : undefined)
    });

    return {
        url: blob.url,
        pathname: blob.pathname
    };
}

export async function deleteFile(url: string): Promise<void> {
    await del(url);
}

export function generateFileName(
    userId: number,
    type: 'video' | 'thumbnail' | 'avatar' | 'banner',
    originalName: string
): string {
    const timestamp = Date.now();
    const ext = originalName.split('.').pop();
    return `${type}s/${userId}/${type}_${timestamp}.${ext}`;
}

export const storage = {
    upload: uploadFile,
    delete: deleteFile,
    generateFileName
};

export default storage;
