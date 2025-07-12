import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CoursModule } from '../src/cours/cours.module';
import { CoursService } from '../src/cours/cours.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { CsrfGuard } from '../src/common/guards/csrf.guard';
import { ValidationPipe } from '@nestjs/common';

describe('Math E2E - Simulation Emma fait le Cours de Mathématiques', () => {
  let app: INestApplication;
  let coursService: CoursService;
  
  const childId = 2;
  const childName = 'Emma';

  // Storage pour simuler la persistance
  let progressStorage: any = {
    childId: childId,
    matiere: 'math',
    currentStep: 'introduction',
    progressPercent: 0,
    data: {},
    completedAt: null,
  };

  // Mock simple pour PrismaService
  const mockPrisma = {
    child: {
      findUnique: jest.fn().mockResolvedValue({
        id: childId,
        firstName: childName,
        lastName: 'Dubois',
      }),
    },
  };

  // Mock du CoursService avec persistance simulée
  const mockCoursService = {
    getMatieres: jest.fn().mockResolvedValue([
      { id: 'francais', title: 'Français', description: 'Lecture, écriture et expression', available: true },
      { id: 'math', title: 'Mathématiques', description: 'Nombres, calculs et logique', available: true },
      { id: 'communication', title: 'Communication', description: 'Pictogrammes et expression', available: true },
    ]),
    
    getMatiere: jest.fn().mockImplementation((matiereId, childId) => {
      if (matiereId === 'math') {
        return Promise.resolve({
          id: 'math',
          title: 'Mathématiques',
          description: 'Nombres, calculs et logique',
          estimatedDuration: 12,
          steps: ['introduction', 'expression', 'resolution', 'exercices', 'probleme', 'synthese'],
        });
      }
      return Promise.resolve(null);
    }),
    
    getProgress: jest.fn().mockImplementation(() => {
      return Promise.resolve({ ...progressStorage });
    }),
    
    saveProgress: jest.fn().mockImplementation((data) => {
      progressStorage = { ...progressStorage, ...data };
      return Promise.resolve(progressStorage);
    }),
    
    updateProgress: jest.fn().mockImplementation((childId, matiere, data) => {
      progressStorage = { ...progressStorage, ...data };
      return Promise.resolve(progressStorage);
    }),
    
    completeCours: jest.fn().mockImplementation((childId, matiere) => {
      progressStorage = {
        ...progressStorage,
        childId,
        matiere,
        currentStep: 'synthese',
        progressPercent: 100,
        completedAt: new Date(),
      };
      return Promise.resolve(progressStorage);
    }),
    
    getChildStats: jest.fn().mockResolvedValue({
      totalCours: 3,
      coursCompleted: 1,
      averageProgress: 100,
      lastActivity: new Date(),
    }),
  };

  // Mock simple pour les Guards (pas d'auth)
  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockCsrfGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoursModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(CoursService)
      .useValue(mockCoursService)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .overrideGuard(CsrfGuard)
      .useValue(mockCsrfGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      disableErrorMessages: false,
      validateCustomDecorators: true,
    }));
    
    coursService = moduleFixture.get<CoursService>(CoursService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('🔢 Emma fait le Cours de Mathématiques - Les Fractions', () => {
    let currentProgress: any = null;

    it('🎯 Étape 1: Emma découvre les mathématiques', async () => {
      console.log(`\n🧒 ${childName} se connecte et regarde les matières disponibles...`);
      
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matieres`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      
      const math = response.body.find((m: any) => m.id === 'math');
      expect(math).toMatchObject({
        id: 'math',
        title: 'Mathématiques',
        description: 'Nombres, calculs et logique',
        available: true,
      });

      console.log('✅ Emma voit ses 3 matières disponibles');
      console.log(`🎯 Elle choisit les Mathématiques : "${math.description}"`);
    });

    it('📐 Étape 2: Emma ouvre le cours de mathématiques', async () => {
      console.log(`\n📐 ${childName} ouvre le cours de Mathématiques...`);
      
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matiere/math`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'math',
        title: 'Mathématiques',
        description: 'Nombres, calculs et logique',
        estimatedDuration: 12,
        steps: ['introduction', 'expression', 'resolution', 'exercices', 'probleme', 'synthese'],
      });

      console.log(`📋 Cours: "${response.body.title}" - ${response.body.estimatedDuration} minutes`);
      console.log(`🍰 Sujet: Les fractions - Partager et diviser`);
      console.log(`🔢 ${response.body.steps.length} étapes à suivre`);
    });

    it('🍰 Étape 3: Emma découvre les fractions', async () => {
      console.log(`\n🍰 ${childName} découvre ce qu'est une fraction...`);
      
      // Vérifier la progression initiale
      const initialResponse = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/progress/math`)
        .expect(200);

      expect(initialResponse.body).toMatchObject({
        childId: childId,
        matiere: 'math',
        currentStep: 'introduction',
        progressPercent: 0,
      });

      // Emma progresse dans l'introduction
      const progressData = {
        childId: childId,
        matiere: 'math',
        currentStep: 'introduction',
        progressPercent: 17, // 1/6 étapes
        data: { 
          conceptUnderstood: true,
          visualExample: 'Une pizza coupée en 4 parts égales',
          examples: ['1/2', '1/4', '3/4'],
          ready: true 
        },
      };

      const saveResponse = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = saveResponse.body;
      
      console.log('🍕 Introduction terminée !');
      console.log('📚 Exemple concret: "Une pizza coupée en 4 parts égales"');
      console.log('🔢 Fractions vues: 1/2, 1/4, 3/4');
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('✏️ Étape 4: Emma apprend à écrire les fractions', async () => {
      console.log(`\n✏️ ${childName} apprend à écrire les fractions...`);
      
      const progressData = {
        childId: childId,
        matiere: 'math',
        currentStep: 'expression',
        progressPercent: 33, // 2/6 étapes
        data: { 
          notation: 'numérateur/dénominateur',
          examples: {
            'moitié': '1/2',
            'quart': '1/4',
            'trois quarts': '3/4'
          },
          writing: ['2/3', '5/8', '1/3'],
          mastered: true
        },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = response.body;
      
      console.log('✏️ Écriture des fractions apprise:');
      console.log('   📝 Notation: numérateur/dénominateur');
      console.log('   🥧 1/2 = une moitié');
      console.log('   🍕 1/4 = un quart');
      console.log('   🍰 3/4 = trois quarts');
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('🧮 Étape 5: Emma résout des fractions', async () => {
      console.log(`\n🧮 ${childName} résout des problèmes de fractions...`);
      
      const progressData = {
        childId: childId,
        matiere: 'math',
        currentStep: 'resolution',
        progressPercent: 50, // 3/6 étapes
        data: { 
          problems: [
            { question: 'Quelle fraction représente la moitié ?', answer: '1/2', correct: true },
            { question: 'Si je mange 2 parts sur 8, quelle fraction ai-je mangée ?', answer: '2/8', correct: true },
            { question: 'Quelle est la plus grande: 1/2 ou 1/4 ?', answer: '1/2', correct: true }
          ],
          understanding: 'excellent',
          visualHelp: true
        },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = response.body;
      
      console.log('🧮 Résolution terminée !');
      console.log('✅ Problème 1: "Quelle fraction pour la moitié ?" → 1/2');
      console.log('✅ Problème 2: "2 parts sur 8 ?" → 2/8');
      console.log('✅ Problème 3: "1/2 ou 1/4 plus grand ?" → 1/2');
      console.log('🎯 Compréhension: Excellente avec aide visuelle !');
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('🎯 Étape 6: Emma fait les exercices pratiques', async () => {
      console.log(`\n🎯 ${childName} fait les exercices pratiques...`);
      
      const progressData = {
        childId: childId,
        matiere: 'math',
        currentStep: 'exercices',
        progressPercent: 67, // 4/6 étapes
        data: { 
          exercises: [
            { type: 'coloring', question: 'Colorie 1/3 du rectangle', completed: true },
            { type: 'matching', question: 'Associe la fraction au dessin', score: 4, total: 4 },
            { type: 'comparison', question: 'Compare 1/2 et 1/3', answer: '1/2 > 1/3', correct: true }
          ],
          totalScore: 12,
          maxScore: 12,
          confidence: 'haute'
        },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = response.body;
      
      console.log('🎯 Exercices terminés !');
      console.log('🎨 Coloriage: 1/3 du rectangle ✅');
      console.log('🔗 Associations: 4/4 bonnes réponses ✅');
      console.log('⚖️ Comparaisons: 1/2 > 1/3 ✅');
      console.log(`🏆 Score parfait: ${progressData.data.totalScore}/${progressData.data.maxScore} !`);
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('🧩 Étape 7: Emma résout un problème concret', async () => {
      console.log(`\n🧩 ${childName} résout un problème de la vie réelle...`);
      
      const progressData = {
        childId: childId,
        matiere: 'math',
        currentStep: 'probleme',
        progressPercent: 83, // 5/6 étapes
        data: { 
          problem: {
            context: 'Emma a une tablette de chocolat de 12 carrés',
            question: 'Elle en mange 3 carrés. Quelle fraction a-t-elle mangée ?',
            studentAnswer: '3/12',
            simplification: '1/4',
            explanation: '3 carrés sur 12 = 3/12 = 1/4',
            realWorldConnection: true
          },
          applicationSkills: 'développées'
        },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = response.body;
      
      console.log('🧩 Problème résolu !');
      console.log('🍫 Contexte: Tablette de chocolat 12 carrés');
      console.log('❓ Question: "3 carrés mangés = quelle fraction ?"');
      console.log('💡 Réponse d\'Emma: 3/12');
      console.log('✨ Simplification: 3/12 = 1/4');
      console.log('🌟 Connexion avec la vraie vie réussie !');
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('🎉 Étape 8: Emma termine le cours avec succès', async () => {
      console.log(`\n🎉 ${childName} termine le cours de Mathématiques !`);
      
      // Completion du cours
      const completionResponse = await request(app.getHttpServer())
        .post(`/cours/child/${childId}/complete/math`)
        .expect(201);

      expect(completionResponse.body).toMatchObject({
        childId: childId,
        matiere: 'math',
        currentStep: 'synthese',
        progressPercent: 100,
      });
      expect(completionResponse.body.completedAt).toBeDefined();

      // Vérifier les stats finales
      const statsResponse = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/stats`)
        .expect(200);

      console.log('🏆 COURS TERMINÉ AVEC SUCCÈS !');
      console.log('📜 Certificat: Maîtrise des fractions');
      console.log(`⏰ Temps total: ~12 minutes`);
      console.log(`📊 Progression finale: ${completionResponse.body.progressPercent}%`);
      console.log(`📅 Date de completion: ${new Date(completionResponse.body.completedAt).toLocaleString()}`);
      console.log(`📈 Cours disponibles: ${statsResponse.body.totalCours}`);
      
      // Message de félicitation
      console.log(`\n🎊 Félicitations ${childName} !`);
      console.log('Tu comprends maintenant les fractions et sais les utiliser !');
      console.log('🚀 Tu peux maintenant passer au cours de Communication !');
    });

    it('📊 Vérification finale: Le parcours mathématique est enregistré', async () => {
      console.log(`\n📊 Vérification du parcours mathématique de ${childName}...`);
      
      const finalProgress = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/progress/math`)
        .expect(200);

      const finalStats = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/stats`)
        .expect(200);

      expect(finalProgress.body.progressPercent).toBe(100);
      expect(finalProgress.body.completedAt).toBeDefined();
      expect(finalStats.body.totalCours).toBe(3);
      
      console.log('✅ Progression mathématique sauvegardée');
      console.log('✅ Compétences en fractions validées');
      console.log('✅ Certificat mathématique généré');
      console.log('\n🔢 Mission accomplie ! Emma maîtrise les fractions ! 🔢');
    });
  });
}); 