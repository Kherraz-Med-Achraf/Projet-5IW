// Setup environment variables before any imports
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.OTP_ENC_KEY = 'test-otp-key-123456789012345678901234';
process.env.FILE_ENCRYPTION_KEY = 'test-file-key-123456789012345678901234';
process.env.STRIPE_SECRET = 'test-stripe-secret';
process.env.MONGO_PASSWORD = 'test-mongo-password';
process.env.NODE_ENV = 'test'; 