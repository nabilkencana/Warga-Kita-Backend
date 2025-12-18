import { Controller, Get, Res, Header } from '@nestjs/common';
import { AppService } from './app.service';
import express from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';
import * as fs from 'fs';

@Controller() // <-- Ini harus kosong untuk route '/'
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get() // <-- Ini menangani route '/'
  @Header('Content-Type', 'text/html')
  getHomePage(): string {
    return this.appService.getDownloadPage();
  }

  @Get('download/app-release.apk')
  @Header('Content-Type', 'application/vnd.android.package-archive')
  @Header('Content-Disposition', 'attachment; filename="app-release.apk"')
  async downloadApk(@Res() res: express.Response) {
    try {
      const filePath = join(process.cwd(), 'public/download/app-release.apk');

      // Cek apakah file ada
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File APK tidak ditemukan. Hubungi administrator.');
      }

      const fileSize = fs.statSync(filePath).size;

      // Set headers
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Cache-Control', 'no-cache');

      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('Error:', error);
        res.status(500).send('Error downloading file');
      });

    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  @Get('api/verify-apk')
  verifyApk() {
    const apkPath = join(process.cwd(), 'public/download/app-release.apk');

    if (!fs.existsSync(apkPath)) {
      return {
        status: 'error',
        message: 'APK file not found. Please place your APK in public/download/app-release.apk'
      };
    }

    const stats = fs.statSync(apkPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    return {
      status: 'success',
      filename: 'warga-kita.apk',
      size: stats.size,
      sizeMB: fileSizeMB,
      lastModified: stats.mtime,
      downloadUrl: '/download/app-release.apk',
      message: `APK siap di-download (${fileSizeMB} MB)`
    };
  }
}