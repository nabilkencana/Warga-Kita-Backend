// src/cloudinary/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
  public_id: string;
  url: string;
  format: string;
  bytes: number;
  created_at: string;
  secure_url: string;
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

@Injectable()
export class CloudinaryService {
  constructor() {
    // Konfigurasi Cloudinary dari environment variables
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  /**
   * Upload file ke Cloudinary
   * @param file File yang akan diupload
   * @param folder Folder tujuan di Cloudinary
   * @returns Promise dengan hasil upload
   */
  async uploadFile(file: Express.Multer.File, folder: string = 'kk_files'): Promise<CloudinaryUploadResult> {
    try {
      return new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const uploadOptions: any = {
          folder,
          resource_type: 'auto', // Deteksi otomatis tipe resource (image, video, raw)
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        };

        // Jika file adalah PDF, set resource_type ke 'raw'
        if (file.mimetype === 'application/pdf') {
          uploadOptions.resource_type = 'raw';
        }

        // Upload menggunakan buffer (lebih aman untuk production)
        if (file.buffer) {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error: UploadApiErrorResponse, result: UploadApiResponse) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(new Error(`Gagal mengupload file: ${error.message}`));
              } else {
                resolve(this.mapUploadResponse(result));
              }
            }
          );

          uploadStream.end(file.buffer);
        }
        // Fallback untuk development (upload dari path)
        else if (file.path) {
          cloudinary.uploader.upload(file.path, uploadOptions)
            .then((result: UploadApiResponse) => resolve(this.mapUploadResponse(result)))
            .catch((error) => {
              console.error('Cloudinary upload error:', error);
              reject(new Error(`Gagal mengupload file: ${error.message}`));
            });
        }
        else {
          reject(new Error('Data file tidak valid'));
        }
      });
    } catch (error) {
      console.error('Cloudinary service error:', error);
      throw new Error(`Gagal mengupload file: ${error.message}`);
    }
  }

  /**
   * Hapus file dari Cloudinary
   * @param publicId Public ID file yang akan dihapus
   * @returns Promise dengan hasil penghapusan
   */
  async deleteFile(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result !== 'ok') {
        throw new Error(`Gagal menghapus file: ${result.result}`);
      }

      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      // Jangan throw error, hanya log saja karena ini mungkin cleanup
      return { result: 'failed', message: error.message };
    }
  }

  /**
   * Update file di Cloudinary (hapus yang lama, upload yang baru)
   * @param oldPublicId Public ID file lama (optional)
   * @param newFile File baru
   * @param folder Folder tujuan
   * @returns Promise dengan hasil upload file baru
   */
  async updateFile(
    oldPublicId: string | null,
    newFile: Express.Multer.File,
    folder: string = 'kk_files'
  ): Promise<CloudinaryUploadResult> {
    try {
      // Hapus file lama jika ada
      if (oldPublicId) {
        try {
          await this.deleteFile(oldPublicId);
          console.log(`🗑️ File lama dihapus: ${oldPublicId}`);
        } catch (error) {
          console.warn('⚠️ Gagal menghapus file lama, melanjutkan upload file baru:', error.message);
        }
      }

      // Upload file baru
      return await this.uploadFile(newFile, folder);
    } catch (error) {
      console.error('Cloudinary update error:', error);
      throw new Error(`Gagal memperbarui file: ${error.message}`);
    }
  }

  /**
   * Validasi file sebelum upload
   * @param file File yang akan divalidasi
   * @param options Opsi validasi (opsional)
   * @returns Hasil validasi
   */
  validateFile(
    file: Express.Multer.File,
    options?: FileValidationOptions
  ): { isValid: boolean; error?: string } {
    // Default options
    const defaultOptions: FileValidationOptions = {
      maxSize: 5 * 1024 * 1024, // 5MB default
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf']
    };

    const { maxSize, allowedTypes } = { ...defaultOptions, ...options };

    // Cek apakah file ada
    if (!file) {
      return {
        isValid: false,
        error: 'File tidak ditemukan'
      };
    }

    // Cek ukuran file
    if (maxSize && file.size > maxSize) {
      return {
        isValid: false,
        error: `Ukuran file terlalu besar. Maksimal ${Math.round(maxSize / (1024 * 1024))}MB`
      };
    }

    // Cek tipe MIME
    if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `Tipe file tidak didukung. Harus: ${allowedTypes.join(', ')}`
      };
    }

    // Validasi ekstensi file dari nama asli
    if (file.originalname) {
      const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
      if (options?.allowedExtensions && !options.allowedExtensions.includes(fileExtension)) {
        return {
          isValid: false,
          error: `Ekstensi file tidak didukung. Harus: ${options.allowedExtensions.join(', ')}`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Generate URL untuk melihat file di Cloudinary
   * @param publicId Public ID file
   * @param options Opsi untuk URL
   * @returns URL file
   */
  generateFileUrl(publicId: string, options?: {
    width?: number;
    height?: number;
    crop?: string;
    format?: string;
  }): string {
    try {
      const url = cloudinary.url(publicId, {
        secure: true,
        ...options
      });
      return url;
    } catch (error) {
      console.error('Error generating file URL:', error);
      return '';
    }
  }

  /**
   * Cek apakah file ada di Cloudinary
   * @param publicId Public ID file
   * @returns Promise dengan status keberadaan file
   */
  async checkFileExists(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.api.resource(publicId);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ambil informasi file dari Cloudinary
   * @param publicId Public ID file
   * @returns Promise dengan informasi file
   */
  async getFileInfo(publicId: string): Promise<any> {
    try {
      return await cloudinary.api.resource(publicId);
    } catch (error) {
      throw new Error(`Gagal mengambil informasi file: ${error.message}`);
    }
  }

  /**
   * Map response dari Cloudinary ke format yang konsisten
   * @param result Hasil upload dari Cloudinary
   * @returns Format yang konsisten
   */
  private mapUploadResponse(result: UploadApiResponse): CloudinaryUploadResult {
    return {
      public_id: result.public_id,
      url: result.secure_url || result.url,
      secure_url: result.secure_url,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at,
    };
  }

  /**
   * Upload multiple files sekaligus
   * @param files Array of files
   * @param folder Folder tujuan
   * @returns Promise dengan array hasil upload
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'kk_files'
  ): Promise<CloudinaryUploadResult[]> {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, folder));
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading multiple files:', error);
      throw new Error(`Gagal mengupload multiple files: ${error.message}`);
    }
  }

  /**
   * Hapus multiple files sekaligus
   * @param publicIds Array of public IDs
   * @returns Promise dengan array hasil penghapusan
   */
  async deleteMultipleFiles(publicIds: string[]): Promise<any[]> {
    try {
      const deletePromises = publicIds.map(publicId => this.deleteFile(publicId));
      return await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting multiple files:', error);
      throw new Error(`Gagal menghapus multiple files: ${error.message}`);
    }
  }

  /**
   * Buat folder di Cloudinary
   * @param folderName Nama folder
   * @returns Promise dengan hasil pembuatan folder
   */
  async createFolder(folderName: string): Promise<any> {
    try {
      return await cloudinary.api.create_folder(folderName);
    } catch (error) {
      console.error('Error creating folder:', error);
      throw new Error(`Gagal membuat folder: ${error.message}`);
    }
  }

  /**
   * Dapatkan semua file dalam folder
   * @param folderName Nama folder
   * @returns Promise dengan daftar file
   */
  async listFilesInFolder(folderName: string): Promise<any> {
    try {
      return await cloudinary.api.resources({
        type: 'upload',
        prefix: folderName,
        max_results: 100
      });
    } catch (error) {
      console.error('Error listing files in folder:', error);
      throw new Error(`Gagal mengambil daftar file: ${error.message}`);
    }
  }
}