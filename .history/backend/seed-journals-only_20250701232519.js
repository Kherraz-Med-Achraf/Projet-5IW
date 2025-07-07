const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

async function seedJournalsOnly() {
  try {
    console.log('📝 Génération des journaux mensuels uniquement...');

    // Récupérer toutes les données existantes
    const academicYears = await prisma.academicYear.findMany();
    const allChildren = await prisma.child.findMany({ select: { id: true } });
    const allEducators = await prisma.user.findMany({
      where: { role: 'STAFF' },
      select: { id: true }
    });

    console.log(`📊 Données disponibles :`);
    console.log(`   - ${academicYears.length} années scolaires`);
    console.log(`   - ${allChildren.length} enfants`);
    console.log(`   - ${allEducators.length} éducateurs`);

    // Missions types et contenus journaux (identiques au seed original)
    const missionTemplates = [
      "Développer l'autonomie dans les gestes de la vie quotidienne",
      "Améliorer les compétences en communication et expression",
      "Renforcer les apprentissages scolaires fondamentaux",
      "Développer les habiletés sociales et relationnelles",
      "Travailler sur la gestion des émotions et du comportement",
      "Améliorer la motricité fine et globale",
      "Développer la confiance en soi et l'estime de soi",
      "Acquérir des compétences préprofessionnelles",
      "Favoriser l'inclusion et la socialisation",
      "Développer la créativité et l'expression artistique"
    ];

    const journalTemplates = [
      "Ce mois-ci, l'enfant a montré des progrès significatifs dans ses apprentissages. Il participe activement aux ateliers éducatifs et démontre une meilleure concentration.",
      "L'enfant a travaillé sur l'autonomie au quotidien. On observe une amélioration dans la gestion de ses affaires personnelles et une plus grande indépendance.",
      "Bonne participation aux activités de groupe. L'enfant développe ses compétences sociales et s'investit davantage dans les projets collectifs.",
      "Ce mois a été marqué par un travail spécifique sur la communication. L'enfant s'exprime de mieux en mieux et interagit positivement avec ses pairs.",
      "L'enfant a bénéficié d'un accompagnement individualisé qui porte ses fruits. On note une évolution positive dans son comportement et sa motivation.",
      "Participation assidue aux ateliers créatifs et sportifs. L'enfant découvre de nouveaux centres d'intérêt et développe ses talents.",
      "Travail approfondi sur les apprentissages scolaires. L'enfant progresse à son rythme et gagne en confiance dans ses capacités.",
      "Ce mois a permis de consolider les acquis précédents. L'enfant maintient ses efforts et continue sa progression dans tous les domaines."
    ];

    // Générer les missions manquantes pour chaque enfant
    for (const year of academicYears) {
      for (const child of allChildren) {
        const existingMissions = await prisma.mission.findMany({
          where: { childId: child.id, academicYearId: year.id }
        });
        
        if (existingMissions.length === 0) {
          // Générer 3-5 missions par enfant par année
          const missionCount = faker.number.int({ min: 3, max: 5 });
          const selectedMissions = faker.helpers.arrayElements(missionTemplates, missionCount);
          
          for (const missionDesc of selectedMissions) {
            await prisma.mission.create({
              data: {
                description: missionDesc,
                childId: child.id,
                academicYearId: year.id
              }
            });
          }
        }
      }
    }
    console.log('✅ Missions créées pour tous les enfants');

    // Logique de génération des journaux (identique au seed principal)
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const periods = [];
    
    const currentAcademicYear = currentMonth >= 9 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
    const previousAcademicYear = currentMonth >= 9 ? `${currentYear - 1}-${currentYear}` : `${currentYear - 2}-${currentYear - 1}`;
    const [prevStartYear, prevEndYear] = previousAcademicYear.split('-').map(Number);
    
    // Année scolaire précédente complète
    for (let month = 9; month <= 12; month++) {
      periods.push({ year: prevStartYear, month, academicYear: previousAcademicYear });
    }
    for (let month = 1; month <= 8; month++) {
      periods.push({ year: prevEndYear, month, academicYear: previousAcademicYear });
    }
    
    // Année scolaire actuelle jusqu'au mois précédent
    const [currentStartYear, currentEndYear] = currentAcademicYear.split('-').map(Number);
    
    if (currentMonth >= 9) {
      for (let month = 9; month < currentMonth; month++) {
        periods.push({ year: currentYear, month, academicYear: currentAcademicYear });
      }
    } else {
      for (let month = 9; month <= 12; month++) {
        periods.push({ year: currentStartYear, month, academicYear: currentAcademicYear });
      }
      for (let month = 1; month < currentMonth; month++) {
        periods.push({ year: currentYear, month, academicYear: currentAcademicYear });
      }
    }
    
    console.log(`ℹ️  Génération des journaux pour ${periods.length} mois`);

    if (allEducators.length === 0) {
      console.log('⚠️  Aucun staff trouvé pour assigner comme éducateur');
      return;
    }

    let educatorIndex = 0;
    let journalsCreated = 0;
    
    for (const child of allChildren) {
      const assignedEducator = allEducators[educatorIndex % allEducators.length];
      educatorIndex++;
      
      for (const { year, month, academicYear: academicYearLabel } of periods) {
        const academicYear = academicYears.find(ay => ay.label === academicYearLabel);
        
        if (!academicYear) {
          console.log(`⚠️  Année scolaire ${academicYearLabel} non trouvée pour ${month}/${year}`);
          continue;
        }
        
        const existingJournal = await prisma.journalMensuel.findFirst({
          where: {
            childId: child.id,
            academicYearId: academicYear.id,
            month: month
          }
        });
        
        if (!existingJournal) {
          const childMissions = await prisma.mission.findMany({
            where: { childId: child.id, academicYearId: academicYear.id }
          });
          
          const progressionMissions = childMissions.reduce((acc, mission) => {
            acc[mission.id] = {
              progression: faker.helpers.arrayElement([
                "En cours de travail",
                "Objectif en cours d'acquisition",
                "Progrès observés",
                "Objectif partiellement atteint",
                "Objectif atteint"
              ]),
              commentaire: faker.helpers.arrayElement([
                "L'enfant montre de l'intérêt et s'investit dans cette mission.",
                "Des progrès sont observés, il faut poursuivre les efforts.",
                "Cette mission nécessite un accompagnement renforcé.",
                "L'enfant a bien intégré les objectifs de cette mission.",
                "Excellent travail, l'enfant dépasse nos attentes."
              ])
            };
            return acc;
          }, {});
          
          // NOUVELLE LOGIQUE AMÉLIORÉE selon l'ancienneté
          const monthDate = new Date(year, month - 1, 15);
          const monthsAgo = Math.max(0, Math.floor((currentDate.getTime() - monthDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
          
          let submissionProbability = 0.3; // base 30%
          if (monthsAgo > 6) submissionProbability = 0.95; // très anciens: 95%
          else if (monthsAgo > 3) submissionProbability = 0.80; // anciens: 80%
          else if (monthsAgo > 1) submissionProbability = 0.60; // récents: 60%
          
          const isSubmitted = faker.datatype.boolean(submissionProbability);
          const isDraft = !isSubmitted && faker.datatype.boolean(0.7); // 70% des non-soumis sont en draft
          
          await prisma.journalMensuel.create({
            data: {
              childId: child.id,
              educatorId: assignedEducator.id,
              academicYearId: academicYear.id,
              month: month,
              isDraft: isDraft,
              isSubmitted: isSubmitted,
              submittedAt: isSubmitted ? faker.date.between({
                from: new Date(year, month - 1, 20),
                to: new Date(year, month, 5)
              }) : null,
              contenu: faker.helpers.arrayElement(journalTemplates),
              progressionMissions: progressionMissions
            }
          });
          
          journalsCreated++;
        }
      }
    }
    console.log(`✅ ${journalsCreated} journaux mensuels créés avec la nouvelle logique !`);
    
  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedJournalsOnly(); 