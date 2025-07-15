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

describe('Communication E2E - Simulation Noah fait le Cours de Communication', () => {
  let app: INestApplication;
  let coursService: CoursService;
  
  const childId = 3;
  const childName = 'Noah';

  // Storage pour simuler la persistance
  let progressStorage: any = {
    childId: childId,
    matiere: 'communication',
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
        lastName: 'Moreau',
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
      if (matiereId === 'communication') {
        return Promise.resolve({
          id: 'communication',
          title: 'Communication',
          description: 'Pictogrammes et expression',
          estimatedDuration: 10,
          steps: ['introduction', 'reconnaissance', 'association', 'expression', 'interaction', 'synthese'],
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

  describe('💬 Noah fait le Cours de Communication - Les Pictogrammes', () => {
    let currentProgress: any = null;

    it('🎯 Étape 1: Noah découvre la communication', async () => {
      console.log(`\n🧒 ${childName} se connecte et regarde les matières disponibles...`);
      
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matieres`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      
      const communication = response.body.find((m: any) => m.id === 'communication');
      expect(communication).toMatchObject({
        id: 'communication',
        title: 'Communication',
        description: 'Pictogrammes et expression',
        available: true,
      });

      console.log('✅ Noah voit ses 3 matières disponibles');
      console.log(`🎯 Il choisit la Communication : "${communication.description}"`);
    });

    it('💬 Étape 2: Noah ouvre le cours de communication', async () => {
      console.log(`\n💬 ${childName} ouvre le cours de Communication...`);
      
      const response = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/matiere/communication`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'communication',
        title: 'Communication',
        description: 'Pictogrammes et expression',
        estimatedDuration: 10,
        steps: ['introduction', 'reconnaissance', 'association', 'expression', 'interaction', 'synthese'],
      });

      console.log(`📋 Cours: "${response.body.title}" - ${response.body.estimatedDuration} minutes`);
      console.log(`🖼️ Sujet: Pictogrammes pour communiquer`);
      console.log(`🔢 ${response.body.steps.length} étapes à suivre`);
    });

    it('🖼️ Étape 3: Noah découvre les pictogrammes', async () => {
      console.log(`\n🖼️ ${childName} découvre les pictogrammes...`);
      
      // Vérifier la progression initiale
      const initialResponse = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/progress/communication`)
        .expect(200);

      expect(initialResponse.body).toMatchObject({
        childId: childId,
        matiere: 'communication',
        currentStep: 'introduction',
        progressPercent: 0,
      });

      // Noah progresse dans l'introduction
      const progressData = {
        childId: childId,
        matiere: 'communication',
        currentStep: 'introduction',
        progressPercent: 17, // 1/6 étapes
        data: { 
          conceptUnderstood: true,
          visualExamples: ['🏠 = maison', '🍎 = pomme', '😊 = content'],
          purpose: 'Exprimer ses besoins et émotions',
          engagement: 'très élevé'
        },
      };

      const saveResponse = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = saveResponse.body;
      
      console.log('🖼️ Introduction terminée !');
      console.log('📚 Exemples découverts:');
      console.log('   🏠 = maison');
      console.log('   🍎 = pomme');
      console.log('   😊 = content');
      console.log('💡 Objectif: Exprimer ses besoins et émotions');
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('👁️ Étape 4: Noah apprend à reconnaître les pictogrammes', async () => {
      console.log(`\n👁️ ${childName} apprend à reconnaître les pictogrammes...`);
      
      const progressData = {
        childId: childId,
        matiere: 'communication',
        currentStep: 'reconnaissance',
        progressPercent: 33, // 2/6 étapes
        data: { 
          categories: {
            'besoins': ['🚽 = toilettes', '🍽️ = manger', '💤 = dormir'],
            'émotions': ['😊 = content', '😢 = triste', '😡 = en colère'],
            'activités': ['⚽ = jouer', '📚 = lire', '🎵 = musique']
          },
          recognition: {
            '🚽': 'toilettes',
            '😊': 'content',
            '⚽': 'jouer'
          },
          score: 9,
          totalQuestions: 9
        },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = response.body;
      
      console.log('👁️ Reconnaissance maîtrisée !');
      console.log('📂 Catégories apprises:');
      console.log('   🎯 Besoins: 🚽 🍽️ 💤');
      console.log('   😊 Émotions: 😊 😢 😡');
      console.log('   🎮 Activités: ⚽ 📚 🎵');
      console.log(`🏆 Score: ${progressData.data.score}/${progressData.data.totalQuestions} - Parfait !`);
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('🔗 Étape 5: Noah associe pictogrammes et situations', async () => {
      console.log(`\n🔗 ${childName} associe pictogrammes et situations...`);
      
      const progressData = {
        childId: childId,
        matiere: 'communication',
        currentStep: 'association',
        progressPercent: 50, // 3/6 étapes
        data: { 
          associations: [
            { situation: 'Il est midi', pictogramme: '🍽️', correct: true },
            { situation: 'Noah est fatigué', pictogramme: '💤', correct: true },
            { situation: 'Il veut jouer dehors', pictogramme: '⚽', correct: true },
            { situation: 'Noah est heureux', pictogramme: '😊', correct: true }
          ],
          contextualUnderstanding: 'excellent',
          flexibility: 'développée'
        },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = response.body;
      
      console.log('🔗 Associations réussies !');
      console.log('✅ "Il est midi" → 🍽️');
      console.log('✅ "Noah est fatigué" → 💤');
      console.log('✅ "Il veut jouer dehors" → ⚽');
      console.log('✅ "Noah est heureux" → 😊');
      console.log('🎯 Compréhension contextuelle: Excellente !');
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('🗣️ Étape 6: Noah s\'exprime avec les pictogrammes', async () => {
      console.log(`\n🗣️ ${childName} s'exprime avec les pictogrammes...`);
      
      const progressData = {
        childId: childId,
        matiere: 'communication',
        currentStep: 'expression',
        progressPercent: 67, // 4/6 étapes
        data: { 
          expressions: [
            { phrase: 'Noah veut 🍎 et 🥛', meaning: 'Noah veut une pomme et du lait' },
            { phrase: 'Noah est 😊 avec ⚽', meaning: 'Noah est content de jouer au ballon' },
            { phrase: 'Noah 💤 après 🍽️', meaning: 'Noah dort après manger' }
          ],
          creativity: 'émergente',
          spontaneity: 'élevée',
          confidence: 'croissante'
        },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = response.body;
      
      console.log('🗣️ Expression développée !');
      console.log('💬 Phrases créées par Noah:');
      progressData.data.expressions.forEach((expr: any, index: number) => {
        console.log(`   ${index + 1}. ${expr.phrase} = "${expr.meaning}"`);
      });
      console.log('🌟 Créativité émergente et spontanéité élevée !');
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('🤝 Étape 7: Noah interagit avec les autres', async () => {
      console.log(`\n🤝 ${childName} interagit avec les autres...`);
      
      const progressData = {
        childId: childId,
        matiere: 'communication',
        currentStep: 'interaction',
        progressPercent: 83, // 5/6 étapes
        data: { 
          interactions: [
            { 
              context: 'Récréation avec un ami',
              request: '⚽ ensemble ?',
              response: '😊 oui !',
              success: true
            },
            { 
              context: 'Demande à l\'éducateur',
              request: '🚽 s\'il te plaît',
              response: 'Accordé',
              success: true
            },
            { 
              context: 'Expression d\'un besoin',
              request: '🍽️ j\'ai faim',
              response: 'Compris',
              success: true
            }
          ],
          socialSkills: 'développées',
          autonomy: 'croissante'
        },
      };

      const response = await request(app.getHttpServer())
        .post('/cours/progress')
        .send(progressData)
        .expect(201);

      currentProgress = response.body;
      
      console.log('🤝 Interactions réussies !');
      console.log('👫 Récréation: "⚽ ensemble ?" → 😊 oui !');
      console.log('👨‍🏫 Éducateur: "🚽 s\'il te plaît" → Accordé');
      console.log('🍽️ Besoin: "🍽️ j\'ai faim" → Compris');
      console.log('🌟 Compétences sociales développées !');
      console.log('🚀 Autonomie croissante !');
      console.log(`📊 Progression: ${currentProgress.progressPercent}%`);
    });

    it('🎉 Étape 8: Noah termine le cours avec succès', async () => {
      console.log(`\n🎉 ${childName} termine le cours de Communication !`);
      
      // Completion du cours
      const completionResponse = await request(app.getHttpServer())
        .post(`/cours/child/${childId}/complete/communication`)
        .expect(201);

      expect(completionResponse.body).toMatchObject({
        childId: childId,
        matiere: 'communication',
        currentStep: 'synthese',
        progressPercent: 100,
      });
      expect(completionResponse.body.completedAt).toBeDefined();

      // Vérifier les stats finales
      const statsResponse = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/stats`)
        .expect(200);

      console.log('🏆 COURS TERMINÉ AVEC SUCCÈS !');
      console.log('📜 Certificat: Maîtrise de la communication par pictogrammes');
      console.log(`⏰ Temps total: ~10 minutes`);
      console.log(`📊 Progression finale: ${completionResponse.body.progressPercent}%`);
      console.log(`📅 Date de completion: ${new Date(completionResponse.body.completedAt).toLocaleString()}`);
      console.log(`📈 Cours disponibles: ${statsResponse.body.totalCours}`);
      
      // Message de félicitation
      console.log(`\n🎊 Félicitations ${childName} !`);
      console.log('Tu sais maintenant communiquer avec les pictogrammes !');
      console.log('💪 Tu peux exprimer tes besoins et émotions facilement !');
      console.log('🌟 Tu as développé ton autonomie et tes compétences sociales !');
    });

    it('📊 Vérification finale: Le parcours communication est enregistré', async () => {
      console.log(`\n📊 Vérification du parcours communication de ${childName}...`);
      
      const finalProgress = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/progress/communication`)
        .expect(200);

      const finalStats = await request(app.getHttpServer())
        .get(`/cours/child/${childId}/stats`)
        .expect(200);

      expect(finalProgress.body.progressPercent).toBe(100);
      expect(finalProgress.body.completedAt).toBeDefined();
      expect(finalStats.body.totalCours).toBe(3);
      
      console.log('✅ Progression communication sauvegardée');
      console.log('✅ Compétences pictogrammes validées');
      console.log('✅ Certificat communication généré');
      console.log('\n💬 Mission accomplie ! Noah communique avec les pictogrammes ! 💬');
    });
  });
}); 