import * as QRCode from 'qrcode';

// ...
const secret = speakeasy.generateSecret({ name: 'MonApp' });
const otpauthUrl = secret.otpauth_url;
const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
return { secret: secret.base32, qrCodeDataUrl, message: 'OTP activé...' };
