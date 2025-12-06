// src/utils/cloudinary.utils.ts
import { CloudinaryUploadResult } from '../cloudinary/cloudinary.service';

export class CloudinaryUtils {
    /**
     * Ekstrak public_id dari URL Cloudinary
     */
    static extractPublicIdFromUrl(url: string): string | null {
        if (!url) return null;

        try {
            const urlParts = url.split('/');
            const filename = urlParts[urlParts.length - 1];
            const publicIdWithExtension = filename.split('?')[0];
            const publicId = publicIdWithExtension.split('.')[0];

            // Jika URL berisi folder, kita perlu mendapatkan full path
            const uploadIndex = urlParts.indexOf('upload');
            if (uploadIndex > -1) {
                const folderParts = urlParts.slice(uploadIndex + 2, -1);
                if (folderParts.length > 0) {
                    return `${folderParts.join('/')}/${publicId}`;
                }
            }

            return publicId;
        } catch (error) {
            console.error('Error extracting public_id from URL:', error);
            return null;
        }
    }

    /**
     * Format bytes ke ukuran yang mudah dibaca
     */
    static formatBytes(bytes: number, decimals: number = 2): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Cek apakah file adalah gambar
     */
    static isImageFile(mimetype: string): boolean {
        return mimetype.startsWith('image/');
    }

    /**
     * Cek apakah file adalah PDF
     */
    static isPdfFile(mimetype: string): boolean {
        return mimetype === 'application/pdf';
    }

    /**
     * Generate thumbnail URL untuk gambar
     */
    static generateThumbnailUrl(publicId: string, width: number = 150, height: number = 150): string {
        return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_fill/${publicId}`;
    }
}