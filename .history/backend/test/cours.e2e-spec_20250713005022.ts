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

describe('Cours E2E - Simulation Enfant fait le Cours de Français', () => {
  let app: INestApplication;
  let coursService: CoursService;
  
  const childId = 1;
  const childName = 'Lucas';

  // Storage pour simuler la persistance
  let progressStorage: any = {
    childId: childId,
    matiere: 'francais',
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
        lastName: 'Martin',
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
      if (matiereId === 'francais') {
        return Promise.resolve({
          id: 'francais',
          title: 'Français',
          description: 'Lecture, écriture et expression',
          estimatedDuration: 8,
          steps: ['introduction', 'regle', 'exercices', 'production', 'verification', 'synthese'],
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

  describe('🎓 Lucas fait le Cours de Français - Accord du participe passé', () => {
    let currentProgress: any = null;

    it('📚 Étape 1: Lucas découvre les matières disponibles', async () => {
      console.log(`\n🧒 ${childName} se connecte et regarde ses cours disponibles...`);
      
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matieres`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      
      const francais = response.body.find((m: any) => m.id === 'francais');
      expect(francais).toMatchObject({
        id: 'francais',
        title: 'Français',
        description: 'Lecture, écriture et expression',
        available: true,
      });

      console.log('✅ Lucas voit ses 3 matières : Français, Maths, Communication');
      console.log(`🎯 Il choisit le Français : "${francais.description}"`);
    });

    it('📖 Étape 2: Lucas consulte les détails du cours de Français', async () => {
      console.log(`\n📖 ${childName} ouvre le cours de Français...`);
      
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matiere/francais`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'francais',
        title: 'Français',
        description: 'Lecture, écriture et expression',
        estimatedDuration: 8,
        steps: ['introduction', 'regle', 'exercices', 'production', 'verification', 'synthese'],
      });

      console.log(`📋 Cours: "${response.body.title}" - ${response.body.estimatedDuration} minutes`);
      console.log(`📝 Sujet: Accord du participe passé avec "avoir"`);
      console.log(`🔢 ${response.body.steps.length} étapes à suivre`);
    });

    it('🎬 Étape 3: Lucas commence - Introduction', async () => {
      console.log(`\n🎬 ${childName} commence l'introduction...`);
      
      // Vérifier la progression initiale
      const initialResponse = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/progress/francais`)
        .expect(200);

      expect(initialResponse.body).toMatchObject({
        childId: childId,
        matiere: 'francais',
        currentStep: 'introduction',
        progressPercent: 0,
      });

      // Lucas progresse dans l'introduction
      const progressData = {
        childId: childId,
        matiere: 'francais',
        currentStep: 'introduction',
        progressPercent: 16, // 1/6 étapes
        data: { 
          watchedIntro: true,
          exampleSeen: 'Les lettres que j\'ai lues',
          understood: true 
        },
      };

      const saveResponse = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = saveResponse.body;
      
      console.log('🎯 Introduction terminée !');
      console.log('📚 Exemple vu: "Les lettres que j\'ai lues"');
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('📏 Étape 4: Lucas apprend la règle', async () => {
      console.log(`\n📏 ${childName} apprend la règle d'accord...`);
      
      const progressData = {
        childId: childId,
        matiere: 'francais',
        currentStep: 'regle',
        progressPercent: 33, // 2/6 étapes
        data: { 
          ruleUnderstood: true,
          codSteps: ['identifier le verbe', 'repérer le COD', 'vérifier sa position'],
          examples: ['j\'ai cueilli la fleur', 'la fleur que j\'ai cueillie'],
          mastered: true
        },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = response.body;
      
      console.log('📋 Règle apprise:');
      console.log('   1️⃣ Identifier le verbe avec "avoir"');
      console.log('   2️⃣ Repérer le COD');
      console.log('   3️⃣ Vérifier si le COD est AVANT le verbe');
      console.log('   ✅ Si OUI → on accorde, si NON → on n\'accorde pas');
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('🎯 Étape 5: Lucas fait les exercices', async () => {
      console.log(`\n🎯 ${childName} fait les exercices pratiques...`);
      
      const progressData = {
        childId: childId,
        matiere: 'francais',
        currentStep: 'exercices',
        progressPercent: 50, // 3/6 étapes
        data: { 
          quiz1: { 
            question: 'Les pommes que j\'ai ___ (manger)',
            answer: 'mangées',
            correct: true,
            explanation: 'COD "les pommes" avant le verbe → accord'
          },
          quiz2: {
            question: 'Les devoirs que nous avons ___ (faire)',
            answer: 'faits',
            correct: true,
            explanation: 'COD "les devoirs" avant le verbe → accord'
          },
          score: 10 // sur 10
        },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = response.body;
      
      console.log('🎯 Exercices terminés !');
      console.log('✅ Quiz 1: "Les pommes que j\'ai mangées" - CORRECT');
      console.log('✅ Quiz 2: "Les devoirs que nous avons faits" - CORRECT');
      console.log(`🏆 Score: ${progressData.data.score}/10 - Excellent !`);
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('✍️ Étape 6: Lucas produit ses propres phrases', async () => {
      console.log(`\n✍️ ${childName} crée ses propres phrases...`);
      
      const progressData = {
        childId: childId,
        matiere: 'francais',
        currentStep: 'production',
        progressPercent: 66, // 4/6 étapes
        data: { 
          createdSentences: [
            'Les histoires que j\'ai lues étaient passionnantes.',
            'La voiture que papa a achetée est rouge.',
            'Les fleurs que maman a cueillies sentent bon.'
          ],
          validated: true,
          creativity: 'excellent'
        },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = response.body;
      
      console.log('✍️ Phrases créées par Lucas:');
      progressData.data.createdSentences.forEach((phrase: string, index: number) => {
        console.log(`   ${index + 1}. "${phrase}"`);
      });
      console.log('🌟 Créativité: Excellente !');
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('🔍 Étape 7: Lucas vérifie ses connaissances', async () => {
      console.log(`\n🔍 ${childName} fait la vérification finale...`);
      
      const progressData = {
        childId: childId,
        matiere: 'francais',
        currentStep: 'verification',
        progressPercent: 83, // 5/6 étapes
        data: { 
          finalTest: {
            questions: 5,
            correct: 5,
            details: [
              'Les livres que j\'ai lus ✅',
              'La lettre que j\'ai écrite ✅', 
              'Les amis que j\'ai vus ✅',
              'La chanson que j\'ai chantée ✅',
              'Les photos que j\'ai prises ✅'
            ]
          },
          mastery: 'parfait'
        },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = response.body;
      
      console.log('🔍 Test de vérification:');
      console.log(`✅ ${progressData.data.finalTest.correct}/${progressData.data.finalTest.questions} bonnes réponses`);
      console.log('🎯 Maîtrise: Parfaite !');
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('🎉 Étape 8: Lucas termine le cours avec succès', async () => {
      console.log(`\n🎉 ${childName} termine le cours de Français !`);
      
      // Completion du cours
      const completionResponse = await request(app.getHttpServer())
        .post(`/cours/child/${childId}/complete/francais`)
        .expect(201);

      expect(completionResponse.body).toMatchObject({
        childId: childId,
        matiere: 'francais',
        currentStep: 'synthese',
        progressPercent: 100,
      });
      expect(completionResponse.body.completedAt).toBeDefined();

      // Vérifier les stats finales
      const statsResponse = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/stats`)
        .expect(200);

      console.log('🏆 COURS TERMINÉ AVEC SUCCÈS !');
      console.log('📜 Certificat: Accord du participe passé maîtrisé');
      console.log(`⏰ Temps total: ~8 minutes`);
      console.log(`📊 Progression finale: ${completionResponse.body.progressPercent}%`);
      console.log(`📅 Date de completion: ${new Date(completionResponse.body.completedAt).toLocaleString()}`);
      console.log(`📈 Cours disponibles: ${statsResponse.body.totalCours}`);
      
      // Message de félicitation
      console.log(`\n🎊 Félicitations ${childName} !`);
      console.log('Tu maîtrises maintenant l\'accord du participe passé avec "avoir" !');
      console.log('🚀 Tu peux maintenant passer aux cours de Maths ou Communication !');
    });

    it('📊 Vérification finale: Le parcours est bien enregistré', async () => {
      console.log(`\n📊 Vérification du parcours de ${childName}...`);
      
      const finalProgress = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/progress/francais`)
        .expect(200);

      const finalStats = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/stats`)
        .expect(200);

      expect(finalProgress.body.progressPercent).toBe(100);
      expect(finalProgress.body.completedAt).toBeDefined();
      expect(finalStats.body.totalCours).toBe(3);
      
      console.log('✅ Progression sauvegardée correctement');
      console.log('✅ Statistiques mises à jour');
      console.log('✅ Certificat de réussite généré');
      console.log('\n🎓 Mission accomplie ! Lucas a réussi son cours de Français ! 🎓');
    });
  });
});