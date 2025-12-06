import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) { }

  // 🟢 Get user profile
  async getUserProfile(userId: number) {
    console.log(`🔍 Getting profile for userId: ${userId}`);

    if (!userId || isNaN(userId)) {
      throw new BadRequestException('User ID tidak valid');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: Number(userId) // Pastikan ini adalah number
      },
      select: {
        id: true,
        namaLengkap: true,
        email: true,
        nik: true,
        tanggalLahir: true,
        tempatLahir: true,
        nomorTelepon: true,
        instagram: true,
        facebook: true,
        alamat: true,
        kota: true,
        negara: true,
        kodePos: true,
        rtRw: true,
        role: true,
        isVerified: true,
        bio: true,
        fotoProfil: true,

        // KK Verification Fields
        kkFile: true,
        kkFilePublicId: true,
        kkRejectionReason: true,
        kkVerifiedAt: true,
        kkVerifiedBy: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
    }

    // Hitung usia dari tanggal lahir
    const usia = user.tanggalLahir
      ? this.calculateAge(user.tanggalLahir)
      : null;

    // Tentukan status verifikasi KK
    const kkVerificationStatus = this.determineKKVerificationStatus(user);

    return {
      ...user,
      usia,
      kkVerificationStatus,
      hasKKDocument: !!user.kkFile,
    };
  }

  // 🟢 Get KK verification status (public method)
  async getKKVerificationStatus(userId: number) {
    console.log(`🔍 Getting KK status for userId: ${userId}`);

    if (!userId || isNaN(userId)) {
      throw new BadRequestException('User ID tidak valid');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: Number(userId)
      },
      select: {
        id: true,
        namaLengkap: true,
        kkFile: true,
        isVerified: true,
        kkRejectionReason: true,
        kkVerifiedAt: true,
        kkVerifiedBy: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
    }

    const status = this.determineKKVerificationStatus(user);

    return {
      ...user,
      kkVerificationStatus: status,
      hasKKDocument: !!user.kkFile,
    };
  }

  // 🟢 Update user profile
  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto, file?: Express.Multer.File) {
    console.log(`🔧 Updating profile for userId: ${userId}`);

    try {
      // Validasi userId
      if (!userId || isNaN(userId)) {
        throw new BadRequestException('User ID tidak valid');
      }

      const numericUserId = Number(userId);

      // Cek apakah user ada
      const existingUser = await this.prisma.user.findUnique({
        where: {
          id: numericUserId
        },
        select: {
          id: true,
          email: true,
          nik: true,
          nomorTelepon: true,
          fotoProfil: true,
        },
      });

      if (!existingUser) {
        throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
      }

      // 🔍 Validasi email unik jika diubah
      if (updateProfileDto.email && updateProfileDto.email !== existingUser.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email: updateProfileDto.email },
        });

        if (emailExists) {
          throw new ConflictException('Email sudah digunakan oleh user lain');
        }
      }

      // 🔍 Validasi NIK unik jika diubah
      if (updateProfileDto.nik && updateProfileDto.nik !== existingUser.nik) {
        const nikExists = await this.prisma.user.findFirst({
          where: { nik: updateProfileDto.nik },
        });

        if (nikExists) {
          throw new ConflictException('NIK sudah digunakan oleh user lain');
        }
      }

      // 🔍 Validasi nomor telepon unik jika diubah
      if (updateProfileDto.nomorTelepon && updateProfileDto.nomorTelepon !== existingUser.nomorTelepon) {
        const phoneExists = await this.prisma.user.findFirst({
          where: {
            nomorTelepon: updateProfileDto.nomorTelepon,
            NOT: { id: numericUserId }
          },
        });

        if (phoneExists) {
          throw new ConflictException('Nomor telepon sudah digunakan oleh user lain');
        }
      }

      // 🟢 Handle file upload ke Cloudinary jika ada file baru
      let cloudinaryResult: any = null;
      if (file) {
        console.log('📁 Processing profile picture upload...');

        const validation = this.cloudinaryService.validateFile(file, {
          maxSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        });

        if (!validation.isValid) {
          throw new BadRequestException(validation.error);
        }

        // Hapus foto lama jika ada
        if (existingUser.fotoProfil) {
          try {
            // Ekstrak public_id dari URL Cloudinary
            const urlParts = existingUser.fotoProfil.split('/');
            const filename = urlParts[urlParts.length - 1];
            const publicId = filename.split('.')[0]; // Hapus ekstensi

            if (publicId && !publicId.includes('http')) {
              await this.cloudinaryService.deleteFile(`profile_pictures/${publicId}`);
              console.log('🗑️ Foto profil lama dihapus dari Cloudinary');
            }
          } catch (error) {
            console.warn('⚠️ Tidak dapat menghapus foto lama:', error.message);
          }
        }

        // Upload file ke Cloudinary
        cloudinaryResult = await this.cloudinaryService.uploadFile(file, 'profile_pictures');
        console.log('✅ Foto profil diupload ke Cloudinary:', cloudinaryResult.url);
      }

      // Prepare update data
      const updateData: any = {};

      if (updateProfileDto.namaLengkap) updateData.namaLengkap = updateProfileDto.namaLengkap;
      if (updateProfileDto.nik) updateData.nik = updateProfileDto.nik;
      if (updateProfileDto.tanggalLahir) {
        const tanggalLahirDate = new Date(updateProfileDto.tanggalLahir);
        if (isNaN(tanggalLahirDate.getTime())) {
          throw new BadRequestException('Format tanggal lahir tidak valid. Gunakan format YYYY-MM-DD');
        }
        updateData.tanggalLahir = tanggalLahirDate;
      }
      if (updateProfileDto.tempatLahir) updateData.tempatLahir = updateProfileDto.tempatLahir;
      if (updateProfileDto.email) updateData.email = updateProfileDto.email;
      if (updateProfileDto.nomorTelepon) updateData.nomorTelepon = updateProfileDto.nomorTelepon;
      if (updateProfileDto.instagram !== undefined) updateData.instagram = updateProfileDto.instagram;
      if (updateProfileDto.facebook !== undefined) updateData.facebook = updateProfileDto.facebook;
      if (updateProfileDto.alamat) updateData.alamat = updateProfileDto.alamat;
      if (updateProfileDto.kota) updateData.kota = updateProfileDto.kota;
      if (updateProfileDto.negara) updateData.negara = updateProfileDto.negara;
      if (updateProfileDto.kodePos) updateData.kodePos = updateProfileDto.kodePos;
      if (updateProfileDto.rtRw) updateData.rtRw = updateProfileDto.rtRw;
      if (updateProfileDto.bio !== undefined) updateData.bio = updateProfileDto.bio;

      // 🟢 Update foto profil jika ada
      if (file && cloudinaryResult) {
        updateData.fotoProfil = cloudinaryResult.url;
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: numericUserId },
        data: updateData,
        select: {
          id: true,
          namaLengkap: true,
          email: true,
          nik: true,
          nomorTelepon: true,
          tanggalLahir: true,
          tempatLahir: true,
          instagram: true,
          facebook: true,
          alamat: true,
          kota: true,
          negara: true,
          kodePos: true,
          rtRw: true,
          bio: true,
          fotoProfil: true,
          role: true,
          isVerified: true,
          updatedAt: true,
        },
      });

      console.log('✅ Profile updated successfully for user:', updatedUser.id);

      return {
        message: 'Profil berhasil diperbarui',
        user: updatedUser,
      };
    } catch (error) {
      console.error('❌ Error saat update profil:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Gagal memperbarui profil: ' + error.message);
    }
  }

  // 🟢 Upload foto profil
  async uploadProfilePicture(userId: number, file: Express.Multer.File) {
    console.log(`📸 Uploading profile picture for userId: ${userId}`);

    try {
      // Validasi userId
      if (!userId || isNaN(userId)) {
        throw new BadRequestException('User ID tidak valid');
      }

      const numericUserId = Number(userId);

      const user = await this.prisma.user.findUnique({
        where: {
          id: numericUserId
        },
        select: {
          id: true,
          namaLengkap: true,
          fotoProfil: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
      }

      // Validasi file
      const validation = this.cloudinaryService.validateFile(file, {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/jpg'],
      });

      if (!validation.isValid) {
        throw new BadRequestException(validation.error);
      }

      // Hapus foto lama jika ada
      if (user.fotoProfil) {
        try {
          // Ekstrak public_id dari URL Cloudinary
          const urlParts = user.fotoProfil.split('/');
          const filename = urlParts[urlParts.length - 1];
          const publicId = filename.split('.')[0]; // Hapus ekstensi

          if (publicId && !publicId.includes('http')) {
            await this.cloudinaryService.deleteFile(`profile_pictures/${publicId}`);
            console.log('🗑️ Foto profil lama dihapus dari Cloudinary');
          }
        } catch (error) {
          console.warn('⚠️ Tidak dapat menghapus foto lama:', error.message);
        }
      }

      // Upload foto baru ke Cloudinary
      const cloudinaryResult = await this.cloudinaryService.uploadFile(
        file,
        'profile_pictures',
      );

      console.log('✅ Foto profil diupload ke Cloudinary:', cloudinaryResult.url);

      // Update user dengan foto baru
      const updatedUser = await this.prisma.user.update({
        where: { id: numericUserId },
        data: {
          fotoProfil: cloudinaryResult.url,
        },
        select: {
          id: true,
          namaLengkap: true,
          fotoProfil: true,
          updatedAt: true,
        },
      });

      return {
        message: 'Foto profil berhasil diupload',
        user: updatedUser,
      };
    } catch (error) {
      console.error('❌ Error uploading profile picture:', error);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Gagal mengupload foto profil: ' + error.message);
    }
  }

  // 🟢 Delete foto profil
  async deleteProfilePicture(userId: number) {
    console.log(`🗑️ Deleting profile picture for userId: ${userId}`);

    // Validasi userId
    if (!userId || isNaN(userId)) {
      throw new BadRequestException('User ID tidak valid');
    }

    const numericUserId = Number(userId);

    const user = await this.prisma.user.findUnique({
      where: {
        id: numericUserId
      },
      select: {
        id: true,
        namaLengkap: true,
        fotoProfil: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
    }

    if (!user.fotoProfil) {
      throw new BadRequestException('Tidak ada foto profil yang bisa dihapus');
    }

    // Hapus dari Cloudinary
    try {
      // Ekstrak public_id dari URL Cloudinary
      const urlParts = user.fotoProfil.split('/');
      const filename = urlParts[urlParts.length - 1];
      const publicId = filename.split('.')[0]; // Hapus ekstensi

      if (publicId && !publicId.includes('http')) {
        await this.cloudinaryService.deleteFile(`profile_pictures/${publicId}`);
        console.log('✅ Foto profil dihapus dari Cloudinary');
      }
    } catch (error) {
      console.warn('⚠️ Gagal menghapus file dari Cloudinary:', error.message);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: numericUserId },
      data: {
        fotoProfil: null,
      },
    });

    return {
      message: 'Foto profil berhasil dihapus',
      user: {
        id: updatedUser.id,
        namaLengkap: updatedUser.namaLengkap,
      },
    };
  }

  // 🟢 Update bio
  async updateBio(userId: number, bio: string) {
    console.log(`📝 Updating bio for userId: ${userId}`);

    // Validasi userId
    if (!userId || isNaN(userId)) {
      throw new BadRequestException('User ID tidak valid');
    }

    const numericUserId = Number(userId);

    const user = await this.prisma.user.findUnique({
      where: {
        id: numericUserId
      },
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: numericUserId },
      data: { bio },
      select: {
        id: true,
        namaLengkap: true,
        bio: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Bio berhasil diperbarui',
      user: updatedUser,
    };
  }

  // 🟢 Change email request (membutuhkan OTP)
  async requestEmailChange(userId: number, newEmail: string) {
    console.log(`📧 Requesting email change for userId: ${userId}`);

    // Validasi userId
    if (!userId || isNaN(userId)) {
      throw new BadRequestException('User ID tidak valid');
    }

    const numericUserId = Number(userId);

    const user = await this.prisma.user.findUnique({
      where: {
        id: numericUserId
      },
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
    }

    // Cek apakah email baru sudah digunakan
    const emailExists = await this.prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (emailExists) {
      throw new ConflictException('Email sudah digunakan oleh user lain');
    }

    // Generate OTP untuk verifikasi email baru
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    // Simpan OTP dan email baru yang diminta
    await this.prisma.user.update({
      where: { id: numericUserId },
      data: {
        newEmailRequested: newEmail,
        otpCode,
        otpExpire,
      },
    });

    // Kirim OTP ke email baru
    // Implementasi: this.emailService.sendOtpToNewEmail(newEmail, otpCode);

    return {
      message: 'OTP telah dikirim ke email baru untuk verifikasi',
      otpExpiresIn: 10, // menit
    };
  }

  // 🟢 Verify email change with OTP
  async verifyEmailChange(userId: number, otpCode: string) {
    console.log(`✅ Verifying email change for userId: ${userId}`);

    // Validasi userId
    if (!userId || isNaN(userId)) {
      throw new BadRequestException('User ID tidak valid');
    }

    const numericUserId = Number(userId);

    const user = await this.prisma.user.findUnique({
      where: {
        id: numericUserId
      },
      select: {
        id: true,
        email: true,
        newEmailRequested: true,
        otpCode: true,
        otpExpire: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
    }

    if (!user.newEmailRequested) {
      throw new BadRequestException('Tidak ada permintaan perubahan email');
    }

    // Validasi OTP
    if (!user.otpCode || user.otpCode !== otpCode) {
      throw new BadRequestException('Kode OTP tidak valid');
    }

    if (!user.otpExpire || user.otpExpire < new Date()) {
      throw new BadRequestException('Kode OTP telah kedaluwarsa');
    }

    // Update email
    const updatedUser = await this.prisma.user.update({
      where: { id: numericUserId },
      data: {
        email: user.newEmailRequested,
        newEmailRequested: null,
        otpCode: null,
        otpExpire: null,
      },
      select: {
        id: true,
        namaLengkap: true,
        email: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Email berhasil diubah',
      user: updatedUser,
    };
  }

  // 🟢 Update phone number (mungkin butuh OTP juga)
  async updatePhoneNumber(userId: number, phoneNumber: string) {
    console.log(`📱 Updating phone number for userId: ${userId}`);

    // Validasi userId
    if (!userId || isNaN(userId)) {
      throw new BadRequestException('User ID tidak valid');
    }

    const numericUserId = Number(userId);

    const user = await this.prisma.user.findUnique({
      where: {
        id: numericUserId
      },
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
    }

    // Cek apakah nomor telepon sudah digunakan
    const phoneExists = await this.prisma.user.findFirst({
      where: {
        nomorTelepon: phoneNumber,
        id: { not: numericUserId }
      },
    });

    if (phoneExists) {
      throw new ConflictException('Nomor telepon sudah digunakan oleh user lain');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: numericUserId },
      data: { nomorTelepon: phoneNumber },
      select: {
        id: true,
        namaLengkap: true,
        nomorTelepon: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Nomor telepon berhasil diperbarui',
      user: updatedUser,
    };
  }

  // 🟢 Get profile activity (riwayat aktivitas user)
  async getProfileActivity(userId: number, page: number = 1, limit: number = 10) {
    console.log(`📊 Getting profile activity for userId: ${userId}`);

    // Validasi userId
    if (!userId || isNaN(userId)) {
      throw new BadRequestException('User ID tidak valid');
    }

    const numericUserId = Number(userId);
    const skip = (page - 1) * limit;

    const activities = await this.prisma.activityLog.findMany({
      where: { userId: numericUserId },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        action: true,
        description: true,
        ipAddress: true,
        userAgent: true,
        timestamp: true,
      },
    });

    const total = await this.prisma.activityLog.count({
      where: { userId: numericUserId }
    });

    // Log aktivitas (opsional)
    await this.logActivity(numericUserId, 'GET_PROFILE_ACTIVITY', 'Melihat riwayat aktivitas profil');

    return {
      data: activities,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 🟢 Get user dashboard statistics
  async getUserDashboardStats(userId: number) {
    console.log(`📈 Getting dashboard stats for userId: ${userId}`);

    // Validasi userId
    if (!userId || isNaN(userId)) {
      throw new BadRequestException('User ID tidak valid');
    }

    const numericUserId = Number(userId);

    const user = await this.prisma.user.findUnique({
      where: {
        id: numericUserId
      },
      select: {
        id: true,
        namaLengkap: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
    }

    // Hitung berbagai statistik
    const [
      totalReports,
      verifiedStatus,
    ] = await Promise.all([
      // Jumlah laporan yang dibuat user
      this.prisma.report.count({ where: { userId: numericUserId } }),

      // Status verifikasi
      this.prisma.user.findUnique({
        where: { id: numericUserId },
        select: {
          isVerified: true,
          kkVerifiedAt: true,
        },
      }),
    ]);

    return {
      user: {
        id: user.id,
        namaLengkap: user.namaLengkap,
        role: user.role,
        isVerified: user.isVerified,
        joinDate: user.createdAt,
      },
      stats: {
        totalReports,
        totalActivities: 0,
        totalDonations: 0,
        verifiedStatus: verifiedStatus?.isVerified ? 'verified' : 'not_verified',
        verificationDate: verifiedStatus?.kkVerifiedAt,
      },
    };
  }

  // ========== HELPER METHODS ==========

  // 🟢 Helper method: Hitung usia
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  // 🟢 Helper method: Tentukan status verifikasi KK
  private determineKKVerificationStatus(user: any): string {
    if (user.isVerified) {
      return 'verified';
    } else if (user.kkRejectionReason) {
      return 'rejected';
    } else if (user.kkFile) {
      return 'pending_review';
    }
    return 'not_uploaded';
  }

  // 🟢 Helper method: Log aktivitas
  private async logActivity(userId: number, action: string, description: string) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          description,
        },
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
}