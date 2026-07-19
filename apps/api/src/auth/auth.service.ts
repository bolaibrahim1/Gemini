import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, ResetPasswordDto } from './dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await argon2.hash(dto.password),
        firstName: dto.firstName,
        lastName: dto.lastName,
        locale: dto.locale ?? 'ar',
      },
    });

    const verificationToken = await this.issueEmailVerification(user.id);
    await this.audit.log({ actorUserId: user.id, action: 'auth.registered', ipAddress });

    // The token is returned so the (not yet built) mailer worker can send it.
    // It must never be exposed in the HTTP response in production.
    return { user, verificationToken };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerification.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerification.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
    await this.audit.log({ actorUserId: record.userId, action: 'auth.email_verified' });
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.passwordHash || user.deactivatedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.audit.log({ actorUserId: user.id, action: 'auth.login_failed', ipAddress });
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user.id, user.email, userAgent, ipAddress);
    await this.audit.log({ actorUserId: user.id, action: 'auth.logged_in', ipAddress });
    return tokens;
  }

  /**
   * Refresh-token rotation (plan §15.1). Each refresh token maps to a session
   * row storing its hash. On refresh the session is revoked and replaced; a
   * token presented after rotation or revocation is treated as theft and all
   * of the user's sessions are revoked.
   */
  async refresh(refreshToken: string, userAgent?: string, ipAddress?: string): Promise<AuthTokens> {
    let payload: { sub: string; sid: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.userSession.findUnique({ where: { id: payload.sid } });
    const hash = sha256(refreshToken);
    if (!session || session.refreshTokenHash !== hash) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (session.revokedAt || session.expiresAt < new Date()) {
      // Reuse of a rotated/revoked token: revoke everything for this user.
      await this.prisma.userSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.log({
        actorUserId: session.userId,
        action: 'auth.refresh_token_reuse_detected',
        ipAddress,
      });
      throw new UnauthorizedException('Session revoked');
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.deactivatedAt) {
      throw new UnauthorizedException('Account unavailable');
    }

    const tokens = await this.issueTokens(user.id, user.email, userAgent, ipAddress, session.id);
    return tokens;
  }

  async logout(sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({ actorUserId: userId, action: 'auth.logged_out_all' });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Do not reveal whether the account exists.
    if (!user) return { resetToken: null };

    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return { resetToken: token, userId: user.id };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(dto.token) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await argon2.hash(dto.password) },
      }),
      // Changing the password invalidates every active session.
      this.prisma.userSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit.log({ actorUserId: record.userId, action: 'auth.password_reset' });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private async issueEmailVerification(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.emailVerification.create({
      data: {
        userId,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return token;
  }

  private async issueTokens(
    userId: string,
    email: string,
    userAgent?: string,
    ipAddress?: string,
    rotatedFromSessionId?: string,
  ): Promise<AuthTokens> {
    const session = await this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash: 'pending',
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL * 1000),
      },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email } satisfies AccessTokenPayload,
      { secret: env.JWT_ACCESS_SECRET, expiresIn: env.JWT_ACCESS_TTL },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, sid: session.id },
      { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_TTL },
    );

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: sha256(refreshToken) },
    });

    if (rotatedFromSessionId) {
      await this.prisma.userSession.update({
        where: { id: rotatedFromSessionId },
        data: { revokedAt: new Date(), replacedById: session.id },
      });
    }

    return { accessToken, refreshToken };
  }
}
