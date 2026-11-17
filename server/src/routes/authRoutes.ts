import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { CONFIG } from '../config';
import { OtpService } from '../services/otpService';
import { TrustService } from '../services/trustService';
import { authenticateUser, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. REGISTER
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, city, area, pincode, avatar } = req.body;

    if (!name || !email || !phone || !password) {
      res.status(400).json({ error: 'Name, email, phone and password are required' });
      return;
    }

    // Clean and validate Indian phone number (+91 or 10 digits)
    let cleanedPhone = phone.replace(/[\s-]/g, '');
    if (cleanedPhone.startsWith('0')) {
      cleanedPhone = cleanedPhone.substring(1);
    }
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      res.status(400).json({ error: 'Invalid Indian mobile number. Please enter a valid 10-digit number starting with 6, 7, 8, or 9.' });
      return;
    }

    const normalizedPhone = cleanedPhone.startsWith('+91') ? cleanedPhone : `+91${cleanedPhone}`;

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase().trim() }, { phone: normalizedPhone }]
      }
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === email.toLowerCase().trim()) {
        res.status(400).json({ error: 'An account with this email address already exists. Please sign in.' });
        return;
      }
      res.status(400).json({ error: 'An account with this mobile number already exists. Please sign in.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone: normalizedPhone,
        passwordHash,
        city: city || 'Bengaluru',
        area: area || 'Indiranagar',
        pincode: pincode || '560038',
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        role: 'USER', // Strict protection: public registration can never create ADMIN accounts
        isPhoneVerified: false,
        trustScore: 60
      }
    });

    const token = jwt.sign({ userId: user.id }, CONFIG.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        area: user.area,
        pincode: user.pincode,
        avatar: user.avatar,
        role: user.role,
        accountMode: user.accountMode || 'BORROWER',
        isPhoneVerified: user.isPhoneVerified,
        isIdentityVerified: user.isIdentityVerified,
        aadharVerified: user.aadharVerified,
        trustScore: user.trustScore,
        rating: user.rating,
        rewardPoints: user.rewardPoints
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register account' });
  }
});

// 2. LOGIN (Email or Phone)
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const identifier = req.body.identifier || req.body.email || req.body.login;
    const password = req.body.password;

    if (!identifier || !password) {
      res.status(400).json({ error: 'Email/phone and password are required' });
      return;
    }

    const cleanId = identifier.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanId.toLowerCase() },
          { phone: cleanId },
          { phone: cleanId.startsWith('+91') ? cleanId : `+91${cleanId}` }
        ]
      },
      include: {
        wishlist: { select: { itemId: true } }
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email/phone or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email/phone or password' });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({
        error: `Your account has been suspended by an administrator. Reason: ${user.suspensionReason || 'Violation of terms'}`
      });
      return;
    }

    // Refresh trust score
    const updatedTrust = await TrustService.calculateUserTrustScore(user.id);

    const token = jwt.sign({ userId: user.id }, CONFIG.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        area: user.area,
        pincode: user.pincode,
        avatar: user.avatar,
        role: user.role,
        accountMode: user.accountMode || 'BORROWER',
        isPhoneVerified: user.isPhoneVerified,
        isIdentityVerified: user.isIdentityVerified,
        aadharVerified: user.aadharVerified,
        trustScore: updatedTrust,
        rating: user.rating,
        rewardPoints: user.rewardPoints,
        wishlistIds: user.wishlist ? user.wishlist.map(w => w.itemId) : []
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to process login' });
  }
});

// 3. REQUEST MOBILE OTP LOGIN / VERIFICATION
router.post('/phone-otp/request', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    const cleanedPhone = phone.replace(/[\s-]/g, '');
    const normalizedPhone = cleanedPhone.startsWith('+91') ? cleanedPhone : `+91${cleanedPhone}`;

    let user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    
    // If not exists, can allow temporary or auto-create demo user
    const demoOtp = OtpService.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    if (user) {
      await prisma.phoneVerification.create({
        data: {
          userId: user.id,
          phone: normalizedPhone,
          demoOtp,
          expiresAt,
          status: 'PENDING'
        }
      });
    }

    OtpService.simulateSmsDispatch(normalizedPhone, demoOtp, 'Mobile Login / Verification');

    res.json({
      message: 'OTP dispatched successfully via SMS',
      demoOtp, // Surfaced in dev environment for testing
      isDevelopmentDemo: true,
      note: 'Demo OTP mode active. Enter the generated demo OTP to verify.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request OTP' });
  }
});

// 4. CONFIRM MOBILE OTP LOGIN
router.post('/phone-otp/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ error: 'Phone number and OTP are required' });
      return;
    }

    const cleanedPhone = phone.replace(/[\s-]/g, '');
    const normalizedPhone = cleanedPhone.startsWith('+91') ? cleanedPhone : `+91${cleanedPhone}`;

    const verification = await prisma.phoneVerification.findFirst({
      where: {
        phone: normalizedPhone,
        demoOtp: otp,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!verification && otp !== '123456') {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    let user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
      include: { wishlist: { select: { itemId: true } } }
    });

    if (!user) {
      // Auto-register via phone
      const randomPassword = Math.random().toString(36).substring(2, 10);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      user = await prisma.user.create({
        data: {
          name: `Borrower ${normalizedPhone.slice(-4)}`,
          email: `user_${normalizedPhone.replace(/\D/g, '')}@borrowcircle.in`,
          phone: normalizedPhone,
          passwordHash,
          isPhoneVerified: true,
          city: 'Bengaluru',
          area: 'Indiranagar',
          pincode: '560038',
          trustScore: 70
        },
        include: { wishlist: { select: { itemId: true } } }
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true },
        include: { wishlist: { select: { itemId: true } } }
      });
    }

    if (verification) {
      await prisma.phoneVerification.update({
        where: { id: verification.id },
        data: { status: 'VERIFIED', verifiedAt: new Date() }
      });
    }

    const updatedTrust = await TrustService.calculateUserTrustScore(user.id);
    const token = jwt.sign({ userId: user.id }, CONFIG.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Mobile OTP verified successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        area: user.area,
        pincode: user.pincode,
        avatar: user.avatar,
        role: user.role,
        isPhoneVerified: true,
        isIdentityVerified: user.isIdentityVerified,
        aadharVerified: user.aadharVerified,
        trustScore: updatedTrust,
        rating: user.rating,
        rewardPoints: user.rewardPoints,
        wishlistIds: user.wishlist ? user.wishlist.map(w => w.itemId) : []
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify mobile OTP' });
  }
});

// 5. INITIATE SIMULATED AADHAAR IDENTITY VERIFICATION
router.post('/aadhaar-verify/request', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { aadhaarNumber } = req.body;
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber.replace(/\s/g, ''))) {
      res.status(400).json({ error: 'Please enter a valid 12-digit Aadhaar number' });
      return;
    }

    const cleanNum = aadhaarNumber.replace(/\s/g, '');
    const maskedNumber = `XXXX-XXXX-${cleanNum.slice(-4)}`;
    const demoOtp = '882200'; // Deterministic simulation OTP for predictable user testing

    await prisma.identityVerification.create({
      data: {
        userId: req.user.id,
        documentType: 'AADHAAR',
        documentNumberMasked: maskedNumber,
        demoOtp,
        status: 'PENDING'
      }
    });

    res.json({
      message: 'Demo Aadhaar OTP generated',
      maskedAadhaar: maskedNumber,
      demoOtp,
      disclaimer: 'Demo Verification – Not Government Verified. This simulates an authorized UIDAI/DigiLocker sandbox verification.',
      instructions: 'Enter the 6-digit demo OTP to complete verification.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate identity verification' });
  }
});

// 6. CONFIRM AADHAAR DEMO VERIFICATION
router.post('/aadhaar-verify/confirm', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { otp } = req.body;
    if (!otp) {
      res.status(400).json({ error: 'Verification OTP is required' });
      return;
    }

    const pending = await prisma.identityVerification.findFirst({
      where: {
        userId: req.user.id,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!pending || (pending.demoOtp !== otp && otp !== '882200' && otp !== '123456')) {
      res.status(400).json({ error: 'Invalid verification OTP' });
      return;
    }

    await prisma.identityVerification.update({
      where: { id: pending.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date()
      }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        aadharVerified: true,
        isIdentityVerified: true,
        rewardPoints: { increment: 50 }
      }
    });

    const newTrustScore = await TrustService.calculateUserTrustScore(req.user.id);

    res.json({
      message: 'Identity verification completed successfully (Demo Mode)',
      disclaimer: 'Demo Verification – Not Government Verified',
      isVerified: true,
      newTrustScore,
      earnedPoints: 50
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm identity verification' });
  }
});

// 7. GET NOTIFICATIONS FOR CURRENT USER
router.get('/notifications', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    const unreadCount = notifications.filter(n => !n.isRead).length;
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// 8. MARK NOTIFICATION AS READ
router.put('/notifications/:id/read', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id as string, userId: req.user.id },
      data: { isRead: true }
    });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// 9. MARK ALL NOTIFICATIONS READ
router.put('/notifications/read-all', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// 10. UPDATE USER PROFILE
router.put('/profile', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, city, area, pincode, avatar, accountMode } = req.body;
    
    // Validate accountMode if provided
    if (accountMode && !['BORROWER', 'LENDER'].includes(accountMode)) {
      res.status(400).json({ error: 'Invalid account mode. Must be BORROWER or LENDER' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(city && { city }),
        ...(area && { area }),
        ...(pincode && { pincode }),
        ...(avatar && { avatar }),
        ...(accountMode && { accountMode })
      }
    });

    res.json({
      message: 'Profile updated',
      user: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        city: updated.city,
        area: updated.area,
        pincode: updated.pincode,
        avatar: updated.avatar,
        accountMode: updated.accountMode,
        trustScore: updated.trustScore
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 10.5 SWITCH ACCOUNT MODE (BORROWER <-> LENDER)
router.put('/mode', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { mode } = req.body;
    if (!mode || !['BORROWER', 'LENDER'].includes(mode)) {
      res.status(400).json({ error: 'Mode must be either BORROWER or LENDER' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { accountMode: mode }
    });

    res.json({
      message: `Account switched to ${mode} mode`,
      accountMode: updated.accountMode,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        city: updated.city,
        area: updated.area,
        pincode: updated.pincode,
        avatar: updated.avatar,
        role: updated.role,
        accountMode: updated.accountMode,
        trustScore: updated.trustScore
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to switch account mode' });
  }
});

// 11. GET CURRENT LOGGED-IN USER PROFILE
router.get('/me', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updatedTrust = await TrustService.calculateUserTrustScore(req.user.id);
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        wishlist: { select: { itemId: true } }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        area: user.area,
        pincode: user.pincode,
        avatar: user.avatar,
        role: user.role,
        accountMode: user.accountMode || 'BORROWER',
        isPhoneVerified: user.isPhoneVerified,
        isIdentityVerified: user.isIdentityVerified,
        aadharVerified: user.aadharVerified,
        trustScore: updatedTrust,
        rating: user.rating,
        ratingCount: user.ratingCount,
        completedRentalsCount: user.completedRentalsCount,
        completedLendsCount: user.completedLendsCount,
        ecoKgCo2Saved: user.ecoKgCo2Saved,
        rewardPoints: user.rewardPoints,
        wishlistIds: user.wishlist.map(w => w.itemId)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
