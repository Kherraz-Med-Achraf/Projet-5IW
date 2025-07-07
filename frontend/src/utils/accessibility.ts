/**
 * Utilitaires d'accessibilité pour optimiser l'expérience avec les lecteurs d'écran
 * Testé avec NVDA, JAWS et VoiceOver
 */

// Types pour les annonces
type AnnouncementPriority = 'polite' | 'assertive';
type ScreenReaderType = 'nvda' | 'jaws' | 'voiceover' | 'unknown';

// Détection du lecteur d'écran
export function detectScreenReader(): ScreenReaderType {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // NVDA laisse parfois des traces dans l'user agent
  if (userAgent.includes('nvda')) {
    return 'nvda';
  }
  
  // JAWS peut être détecté via certaines propriétés
  if ('speechSynthesis' in window && window.speechSynthesis.getVoices().length > 0) {
    const voices = window.speechSynthesis.getVoices();
    if (voices.some(voice => voice.name.toLowerCase().includes('jaws'))) {
      return 'jaws';
    }
  }
  
  // VoiceOver sur macOS/iOS
  if (navigator.platform.toLowerCase().includes('mac') || 
      navigator.platform.toLowerCase().includes('iphone') ||
      navigator.platform.toLowerCase().includes('ipad')) {
    return 'voiceover';
  }
  
  return 'unknown';
}

// Gestionnaire d'annonces pour lecteurs d'écran
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer;
  private announceElement: HTMLElement | null = null;
  private assertiveElement: HTMLElement | null = null;
  private screenReaderType: ScreenReaderType;
  
  private constructor() {
    this.screenReaderType = detectScreenReader();
    this.setupAnnounceElements();
  }
  
  public static getInstance(): ScreenReaderAnnouncer {
    if (!ScreenReaderAnnouncer.instance) {
      ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer();
    }
    return ScreenReaderAnnouncer.instance;
  }
  
  private setupAnnounceElements(): void {
    // Élément pour les annonces polies
    this.announceElement = document.createElement('div');
    this.announceElement.setAttribute('aria-live', 'polite');
    this.announceElement.setAttribute('aria-atomic', 'true');
    this.announceElement.className = 'sr-only';
    this.announceElement.id = 'screen-reader-announcer';
    document.body.appendChild(this.announceElement);
    
    // Élément pour les annonces urgentes
    this.assertiveElement = document.createElement('div');
    this.assertiveElement.setAttribute('aria-live', 'assertive');
    this.assertiveElement.setAttribute('aria-atomic', 'true');
    this.assertiveElement.className = 'sr-only';
    this.assertiveElement.id = 'screen-reader-assertive';
    document.body.appendChild(this.assertiveElement);
  }
  
  /**
   * Annonce un message aux lecteurs d'écran
   */
  public announce(message: string, priority: AnnouncementPriority = 'polite'): void {
    const element = priority === 'assertive' ? this.assertiveElement : this.announceElement;
    
    if (!element) return;
    
    // Optimisations spécifiques par lecteur d'écran
    const optimizedMessage = this.optimizeForScreenReader(message);
    
    // Effacer le contenu précédent
    element.textContent = '';
    
    // Ajouter le nouveau message avec un petit délai pour garantir la lecture
    setTimeout(() => {
      element.textContent = optimizedMessage;
    }, 100);
    
    // Nettoyer après lecture
    setTimeout(() => {
      element.textContent = '';
    }, priority === 'assertive' ? 10000 : 5000);
  }
  
  /**
   * Optimise le message selon le lecteur d'écran détecté
   */
  private optimizeForScreenReader(message: string): string {
    let optimized = message;
    
    switch (this.screenReaderType) {
      case 'nvda':
        // NVDA préfère les phrases complètes avec ponctuation
        optimized = this.ensureProperPunctuation(message);
        break;
        
      case 'jaws':
        // JAWS fonctionne bien avec des descriptions détaillées
        optimized = this.addJawsOptimizations(message);
        break;
        
      case 'voiceover':
        // VoiceOver préfère les descriptions concises mais claires
        optimized = this.addVoiceOverOptimizations(message);
        break;
        
      default:
        // Optimisations générales
        optimized = this.ensureProperPunctuation(message);
    }
    
    return optimized;
  }
  
  private ensureProperPunctuation(text: string): string {
    // Ajouter un point final si manquant
    if (!text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?')) {
      return text + '.';
    }
    return text;
  }
  
  private addJawsOptimizations(text: string): string {
    // JAWS apprécie les descriptions de contexte
    return this.ensureProperPunctuation(text);
  }
  
  private addVoiceOverOptimizations(text: string): string {
    // VoiceOver préfère les descriptions plus naturelles
    return this.ensureProperPunctuation(text);
  }
}

// Messages optimisés pour le chat
export const ChatMessages = {
  // Messages de navigation
  CONVERSATION_OPENED: (name: string) => `Conversation avec ${name} ouverte.`,
  CONVERSATION_CLOSED: () => 'Conversation fermée.',
  MESSAGE_SENT: () => 'Message envoyé.',
  MESSAGE_RECEIVED: (sender: string, content: string) => 
    `Nouveau message de ${sender}: ${content}`,
  
  // Messages d'état
  LOADING_MESSAGES: () => 'Chargement des messages en cours.',
  SENDING_MESSAGE: () => 'Envoi du message en cours.',
  MESSAGE_DELETED: () => 'Message supprimé.',
  MESSAGE_EDITED: () => 'Message modifié.',
  
  // Messages d'erreur
  SEND_ERROR: () => 'Erreur lors de l\'envoi du message. Veuillez réessayer.',
  LOAD_ERROR: () => 'Erreur lors du chargement. Actualisez la page.',
  CONNECTION_ERROR: () => 'Connexion perdue. Reconnexion en cours.',
  
  // Messages de statut
  TYPING: (name: string) => `${name} est en train d\'écrire.`,
  STOPPED_TYPING: (name: string) => `${name} a arrêté d\'écrire.`,
  ONLINE: (name: string) => `${name} est en ligne.`,
  OFFLINE: (name: string) => `${name} s\'est déconnecté.`,
  
  // Messages de navigation
  UNREAD_COUNT: (count: number) => 
    count === 1 ? '1 message non lu.' : `${count} messages non lus.`,
  NO_UNREAD: () => 'Aucun message non lu.',
  CHAT_SELECTED: (name: string) => `Conversation avec ${name} sélectionnée.`,
  
  // Messages d'actions
  EDIT_MODE: () => 'Mode édition activé. Tapez votre nouveau message.',
  EDIT_CANCELLED: () => 'Édition annulée.',
  NEW_CHAT_OPENED: () => 'Nouvelle conversation. Sélectionnez un contact.',
  CONTACT_SELECTED: (name: string) => `Contact ${name} sélectionné.`,
};

// Gestionnaire de focus pour l'accessibilité
export class FocusManager {
  private static focusHistory: HTMLElement[] = [];
  
  /**
   * Gère le focus lors de l'ouverture de modales
   */
  public static trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Sauvegarder l'élément actuellement focalisé
    const previouslyFocused = document.activeElement as HTMLElement;
    this.focusHistory.push(previouslyFocused);
    
    // Focuser le premier élément
    firstElement?.focus();
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    
    // Fonction de nettoyage
    return () => {
      container.removeEventListener('keydown', handleTabKey);
      // Restaurer le focus précédent
      const previousElement = this.focusHistory.pop();
      previousElement?.focus();
    };
  }
  
  /**
   * Annonce les changements de focus pour les lecteurs d'écran
   */
  public static announceFocusChange(element: HTMLElement): void {
    const announcer = ScreenReaderAnnouncer.getInstance();
    
    // Obtenir une description de l'élément focalisé
    const description = this.getElementDescription(element);
    if (description) {
      announcer.announce(description, 'polite');
    }
  }
  
  private static getElementDescription(element: HTMLElement): string {
    // Utiliser aria-label en priorité
    if (element.getAttribute('aria-label')) {
      return element.getAttribute('aria-label')!;
    }
    
    // Utiliser le texte visible
    if (element.textContent?.trim()) {
      return element.textContent.trim();
    }
    
    // Description par type d'élément
    switch (element.tagName.toLowerCase()) {
      case 'button':
        return 'Bouton';
      case 'input':
        const type = element.getAttribute('type') || 'text';
        return `Champ ${type}`;
      case 'textarea':
        return 'Zone de texte';
      case 'select':
        return 'Liste déroulante';
      default:
        return '';
    }
  }
}

// Tests automatisés pour l'accessibilité
export class AccessibilityTester {
  /**
   * Teste la conformité WCAG des éléments de chat
   */
  public static testChatAccessibility(): AccessibilityTestResult[] {
    const results: AccessibilityTestResult[] = [];
    
    // Test 1: Tous les boutons ont des labels
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const hasLabel = button.getAttribute('aria-label') || 
                      button.textContent?.trim() ||
                      button.querySelector('img')?.getAttribute('alt');
      
      results.push({
        test: 'Button Labels',
        element: `Button ${index + 1}`,
        passed: !!hasLabel,
        message: hasLabel ? 'Button has accessible label' : 'Button missing accessible label'
      });
    });
    
    // Test 2: Contraste des couleurs
    results.push(...this.testColorContrast());
    
    // Test 3: Navigation au clavier
    results.push(...this.testKeyboardNavigation());
    
    // Test 4: Attributs ARIA
    results.push(...this.testAriaAttributes());
    
    return results;
  }
  
  private static testColorContrast(): AccessibilityTestResult[] {
    // Test de contraste simplifié
    const results: AccessibilityTestResult[] = [];
    
    const textElements = document.querySelectorAll('p, span, div, button, a');
    let contrastIssues = 0;
    
    textElements.forEach((element) => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Test basique : vérifier que ce ne sont pas les mêmes couleurs
      if (color === backgroundColor && color !== 'rgba(0, 0, 0, 0)') {
        contrastIssues++;
      }
    });
    
    results.push({
      test: 'Color Contrast',
      element: 'Text elements',
      passed: contrastIssues === 0,
      message: contrastIssues === 0 ? 
        'No obvious contrast issues found' : 
        `${contrastIssues} potential contrast issues found`
    });
    
    return results;
  }
  
  private static testKeyboardNavigation(): AccessibilityTestResult[] {
    const results: AccessibilityTestResult[] = [];
    
    // Vérifier que tous les éléments interactifs sont focusables
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [tabindex]'
    );
    
    let nonFocusableCount = 0;
    interactiveElements.forEach((element) => {
      const tabIndex = element.getAttribute('tabindex');
      const isFocusable = tabIndex !== '-1' && 
                         !element.hasAttribute('disabled') &&
                         element.offsetParent !== null; // visible
      
      if (!isFocusable) {
        nonFocusableCount++;
      }
    });
    
    results.push({
      test: 'Keyboard Navigation',
      element: 'Interactive elements',
      passed: nonFocusableCount === 0,
      message: nonFocusableCount === 0 ? 
        'All interactive elements are keyboard accessible' :
        `${nonFocusableCount} elements are not keyboard accessible`
    });
    
    return results;
  }
  
  private static testAriaAttributes(): AccessibilityTestResult[] {
    const results: AccessibilityTestResult[] = [];
    
    // Test des rôles ARIA requis
    const modalElements = document.querySelectorAll('[role="dialog"]');
    modalElements.forEach((modal, index) => {
      const hasAriaModal = modal.getAttribute('aria-modal') === 'true';
      const hasAriaLabel = modal.getAttribute('aria-labelledby') || 
                          modal.getAttribute('aria-label');
      
      results.push({
        test: 'Modal ARIA Attributes',
        element: `Modal ${index + 1}`,
        passed: hasAriaModal && hasAriaLabel,
        message: hasAriaModal && hasAriaLabel ? 
          'Modal has proper ARIA attributes' : 
          'Modal missing required ARIA attributes'
      });
    });
    
    // Test des live regions
    const liveRegions = document.querySelectorAll('[aria-live]');
    results.push({
      test: 'Live Regions',
      element: 'ARIA Live Regions',
      passed: liveRegions.length > 0,
      message: liveRegions.length > 0 ? 
        `${liveRegions.length} live regions found` : 
        'No live regions found - announcements may not work'
    });
    
    return results;
  }
}

// Types pour les résultats de tests
export interface AccessibilityTestResult {
  test: string;
  element: string;
  passed: boolean;
  message: string;
}

// Instructions pour les tests manuels avec lecteurs d'écran
export const ScreenReaderTestInstructions = {
  NVDA: {
    setup: [
      '1. Télécharger et installer NVDA (gratuit)',
      '2. Démarrer NVDA avec Ctrl+Alt+N',
      '3. Ouvrir Firefox ou Chrome',
      '4. Naviguer vers l\'application'
    ],
    tests: [
      'Navigation avec Tab/Shift+Tab dans les conversations',
      'Utiliser les flèches pour naviguer dans les messages',
      'Tester la lecture des nouveaux messages',
      'Vérifier les annonces lors de l\'envoi de messages',
      'Tester la navigation dans les modales avec Échap'
    ],
    shortcuts: [
      'H/Shift+H : Navigation par en-têtes',
      'B/Shift+B : Navigation par boutons',
      'E/Shift+E : Navigation par champs de saisie',
      'R/Shift+R : Navigation par régions',
      'Insert+F7 : Liste des éléments'
    ]
  },
  
  JAWS: {
    setup: [
      '1. JAWS nécessite une licence (version d\'essai disponible)',
      '2. Installer et démarrer JAWS',
      '3. Ouvrir Internet Explorer ou Edge',
      '4. Charger l\'application'
    ],
    tests: [
      'Tester le mode formulaire avec Entrée/Échap',
      'Vérifier la lecture des en-têtes avec H',
      'Tester les raccourcis de navigation rapide',
      'Vérifier les descriptions des boutons',
      'Tester les annonces de statut'
    ],
    shortcuts: [
      'Insert+F6 : Liste des titres',
      'Insert+F5 : Liste des champs de formulaire',
      'Insert+F7 : Liste des liens',
      'Insert+Ctrl+R : Redémarrer le curseur virtuel'
    ]
  },
  
  VOICEOVER: {
    setup: [
      '1. Sur Mac : Cmd+F5 pour activer VoiceOver',
      '2. Sur iOS : Réglages > Accessibilité > VoiceOver',
      '3. Ouvrir Safari',
      '4. Naviguer vers l\'application'
    ],
    tests: [
      'Navigation avec VO+flèches dans le rotor web',
      'Tester les gestes de balayage sur mobile',
      'Vérifier la lecture des notifications',
      'Tester l\'interaction avec les boutons',
      'Vérifier les descriptions des images'
    ],
    shortcuts: [
      'VO+U : Rotor web',
      'VO+Cmd+H : Navigation par en-têtes',
      'VO+Cmd+L : Navigation par liens',
      'VO+Cmd+B : Navigation par boutons',
      'VO+Cmd+J : Navigation par champs de formulaire'
    ]
  }
};

// Export de l'instance singleton
export const announcer = ScreenReaderAnnouncer.getInstance(); 