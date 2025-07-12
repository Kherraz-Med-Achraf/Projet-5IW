import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CoursProgress {
  childId: number;
  matiere: string;
  currentStep: string;
  progressPercent: number;
  completedAt?: Date;
  data?: Record<string, any>;
}

export interface CoursMatiere {
  id: string;
  title: string;
  description: string;
  icon: string;
  estimatedDuration: number; // minutes
  steps: string[];
  available: boolean;
}

@Injectable()
export class CoursService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère toutes les matières disponibles pour un enfant
   */
  async getMatieres(childId: number): Promise<CoursMatiere[]> {
    // Vérifier que l'enfant existe
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new NotFoundException(`Enfant ${childId} introuvable`);
    }

    return [
      {
        id: 'francais',
        title: 'Français',
        description: 'Lecture, écriture et expression',
        icon: 'menu_book',
        estimatedDuration: 8,
        steps: ['introduction', 'regle', 'exercices', 'production', 'verification', 'synthese'],
        available: true,
      },
      {
        id: 'math',
        title: 'Mathématiques',
        description: 'Nombres, calculs et logique',
        icon: 'calculate',
        estimatedDuration: 12,
        steps: ['introduction', 'expression', 'resolution', 'exercices', 'probleme', 'synthese'],
        available: true,
      },
      {
        id: 'communication',
        title: 'Communication',
        description: 'Pictogrammes et expression',
        icon: 'chat',
        estimatedDuration: 8,
        steps: ['introduction', 'pictogrammes', 'sequence', 'activite', 'creation', 'conclusion'],
        available: true,
      },
    ];
  }

  /**
   * Récupère une matière spécifique
   */
  async getMatiere(matiereId: string, childId: number): Promise<CoursMatiere> {
    const matieres = await this.getMatieres(childId);
    const matiere = matieres.find(m => m.id === matiereId);
    
    if (!matiere) {
      throw new NotFoundException(`Matière ${matiereId} introuvable`);
    }

    return matiere;
  }

  /**
   * Récupère la progression d'un enfant pour une matière
   */
  async getProgress(childId: number, matiere: string): Promise<CoursProgress | null> {
    // Simule la progression stockée (pourrait être en base ou en cache)
    // Pour l'instant, retourne une progression par défaut
    return {
      childId,
      matiere,
      currentStep: 'introduction',
      progressPercent: 0,
      data: {},
    };
  }

  /**
   * Sauvegarde la progression d'un enfant
   */
  async saveProgress(progress: CoursProgress): Promise<CoursProgress> {
    // Vérifier que l'enfant existe
    const child = await this.prisma.child.findUnique({
      where: { id: progress.childId },
    });

    if (!child) {
      throw new NotFoundException(`Enfant ${progress.childId} introuvable`);
    }

    // Valider la matière
    const matiere = await this.getMatiere(progress.matiere, progress.childId);
    
    if (!matiere.steps.includes(progress.currentStep)) {
      throw new NotFoundException(`Étape ${progress.currentStep} invalide pour la matière ${progress.matiere}`);
    }

    // Ici on pourrait sauvegarder en base de données
    // Pour l'instant, on retourne juste la progression mise à jour
    return {
      ...progress,
      data: progress.data || {},
    };
  }

  /**
   * Marque un cours comme terminé
   */
  async completeCours(childId: number, matiere: string): Promise<CoursProgress> {
    const progress = await this.getProgress(childId, matiere) || {
      childId,
      matiere,
      currentStep: 'synthese',
      progressPercent: 100,
    };

    progress.progressPercent = 100;
    progress.completedAt = new Date();
    progress.currentStep = 'synthese';

    return this.saveProgress(progress);
  }

  /**
   * Récupère les statistiques de progression pour un enfant
   */
  async getChildStats(childId: number): Promise<{
    totalCours: number;
    coursCompleted: number;
    averageProgress: number;
    lastActivity?: Date;
  }> {
    const matieres = await this.getMatieres(childId);
    
    // Simulation des stats
    return {
      totalCours: matieres.length,
      coursCompleted: 0,
      averageProgress: 0,
      lastActivity: new Date(),
    };
  }
} 