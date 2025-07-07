/**
 * Configuration globale pour les tests
 */

// Augmenter le timeout pour les tests lents
jest.setTimeout(30000);

// Configuration des variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/blog_test';

// Mock global pour console.log dans les tests
global.console = {
  ...console,
  // Désactiver les logs pendant les tests sauf erreurs
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Mock pour les modules externes
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(() => Promise.resolve()),
  })),
}));

// Mock pour OpenAI si utilisé
jest.mock('openai', () => ({
  OpenAI: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(() =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: 'Mocked AI response',
                },
              },
            ],
          }),
        ),
      },
    },
  })),
}));

// Cleanup après chaque test
afterEach(() => {
  jest.clearAllMocks();
});

// Configuration globale pour les tests de base de données
beforeAll(() => {
  // Configuration spécifique si nécessaire
});

afterAll(() => {
  // Cleanup global
});
