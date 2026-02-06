import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Mail Service
 *
 * - MAIL_HOST 설정이 있으면 실제 SMTP 사용
 * - MAIL_HOST 설정이 없으면 Ethereal (테스트 SMTP) 사용
 * - OnModuleInit으로 비동기 초기화 처리
 */
@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeTransporter();
  }

  private async initializeTransporter() {
    const mailUser = this.configService.get('MAIL_USER');
    const mailPassword = this.configService.get('MAIL_PASSWORD');

    if (mailUser && mailPassword) {
      // Gmail SMTP 사용
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: mailUser,
          pass: mailPassword,
        },
      });
      console.log(`Mail transporter initialized: Gmail (${mailUser})`);
    } else {
      // SMTP 설정이 없으면 Ethereal 테스트 계정
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Mail transporter initialized: Ethereal (test)');
    }
  }

  /**
   * 비밀번호 재설정 이메일 발송
   */
  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
  ): Promise<{ success: boolean; previewUrl?: string }> {
    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"ADHD NFC" <${this.configService.get('MAIL_FROM') || 'noreply@adhd-nfc.com'}>`,
      to,
      subject: '[ADHD NFC] 비밀번호 재설정',
      html: this.getPasswordResetTemplate(resetUrl),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      // 개발환경: Ethereal 미리보기 URL 반환
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Preview URL:', previewUrl);
      }

      return {
        success: true,
        previewUrl: previewUrl || undefined,
      };
    } catch (error) {
      console.error('이메일 발송 실패:', error);
      return { success: false };
    }
  }

  /**
   * 비밀번호 재설정 이메일 템플릿
   */
  private getPasswordResetTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Apple SD Gothic Neo', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #4F46E5; }
          .content { padding: 30px 0; }
          .button {
            display: inline-block;
            padding: 14px 30px;
            background-color: #4F46E5;
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
          }
          .footer { padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; }
          .warning { background-color: #FEF3C7; padding: 12px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ADHD NFC</h1>
          </div>
          <div class="content">
            <h2>비밀번호 재설정</h2>
            <p>안녕하세요,</p>
            <p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새로운 비밀번호를 설정해주세요.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">비밀번호 재설정</a>
            </p>
            <div class="warning">
              <strong>주의사항:</strong>
              <ul>
                <li>이 링크는 24시간 동안만 유효합니다.</li>
                <li>본인이 요청하지 않았다면 이 이메일을 무시해주세요.</li>
              </ul>
            </div>
            <p>버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
            <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>본 메일은 발신 전용이며, 문의사항은 고객센터를 이용해주세요.</p>
            <p>&copy; 2024 ADHD NFC. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
