// src/auth/auth.controller.ts
import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import express from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // 🔐 OTP Authentication
  @Post('send-otp')
  async sendOtp(@Body('email') email: string) {
    return this.authService.sendOtp(email);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() 
    body: { email: string; otp: string;},
    @Req ()
    req : express.Request
  ) {
    return this.authService.verifyOtp(body.email, body.otp , req);
  }

  // 🔐 Google OAuth Routes
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Guard will redirect to Google
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req) {
    return this.authService.googleLogin(req);
  }

  // 📱 Mobile Google Auth
  @Post('google/mobile')
  async googleAuthMobile(@Body() body: any) {
    return this.authService.googleMobileLogin(body);
  }

  // 🔒 Protected Route dengan JWT
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    return req.user;
  }

  // 🧪 Test Route
  @Get('test')
  testAuth() {
    return { message: 'Auth API is working!' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('login-history')
  async loginHistory(@Req() req) {
    return this.authService.getLoginHistory(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(@Req() req: any) {
    return this.authService.logoutAllDevices(req.user.id);
  }


}