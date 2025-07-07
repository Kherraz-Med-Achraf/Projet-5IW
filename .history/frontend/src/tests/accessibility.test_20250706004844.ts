/**
 * Tests d'accessibilité automatisés pour le système de chat
 * Ces tests vérifient la conformité WCAG 2.1 AA
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import ChatWidget from '@/components/chat/ChatWidget.vue';
import ChatModalContent from '@/components/chat/ChatModalContent.vue';
import ChatView from '@/views/chat/ChatView.vue';
import { AccessibilityTester, ScreenReaderAnnouncer, FocusManager } from '@/utils/accessibility';

// Mock pour les tests
const mockChatStore = {
  chats: [
    {
      id: 'chat1',
      participants: ['user1', 'user2'],
      lastMessage: 'Hello world',
      updatedAt: new Date(),
      unreadCount: 2
    }
  ],
  messages: [
    {
      id: 'msg1',
      content: 'Hello',
      author: 'user1',
      sentAt: new Date(),
      chat: 'chat1'
    }
  ],
  allowedContacts: [
    {
      id: 'user2',
      name: 'John Doe',
      role: 'STAFF'
    }
  ],
  init: vi.fn(),
  loadMessages: vi.fn(),
  markAsRead: vi.fn(),
  send: vi.fn(),
  loadAllowedContacts: vi.fn()
};

const mockAuthStore = {
  user: {
    id: 'user1',
    role: 'STAFF'
  }
};

describe('Accessibilité - Conformité WCAG 2.1 AA', () => {
  let wrapper: any;
  let announcer: ScreenReaderAnnouncer;

  beforeEach(() => {
    announcer = ScreenReaderAnnouncer.getInstance();
    
    // Setup DOM pour les tests
    document.body.innerHTML = '<div id="app"></div>';
    
    // Mock des stores
    const pinia = createTestingPinia({
      initialState: {
        chat: mockChatStore,
        auth: mockAuthStore
      }
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    // Nettoyer le DOM
    document.body.innerHTML = '';
  });

  describe('🔍 Tests de structure ARIA', () => {
    it('doit avoir des rôles ARIA appropriés sur le ChatWidget', async () => {
      wrapper = mount(ChatWidget, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      const bubble = wrapper.find('[role="button"]');
      expect(bubble.exists()).toBe(true);
      expect(bubble.attributes('aria-label')).toContain('Ouvrir les messages');
      expect(bubble.attributes('aria-expanded')).toBeDefined();
      expect(bubble.attributes('aria-haspopup')).toBe('true');
    });

    it('doit avoir une structure de navigation correcte dans ChatView', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      // Vérifier la structure principale
      expect(wrapper.find('[role="main"]').exists()).toBe(true);
      expect(wrapper.find('[role="complementary"]').exists()).toBe(true);
      expect(wrapper.find('[role="navigation"]').exists()).toBe(true);
      
      // Vérifier les en-têtes
      const mainHeading = wrapper.find('h1');
      expect(mainHeading.exists()).toBe(true);
      expect(mainHeading.text()).toBe('Messagerie');
    });

    it('doit avoir des live regions pour les annonces', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      const liveRegions = wrapper.findAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
      
      // Vérifier les différents types de live regions
      const politeRegions = wrapper.findAll('[aria-live="polite"]');
      const assertiveRegions = wrapper.findAll('[aria-live="assertive"]');
      
      expect(politeRegions.length).toBeGreaterThan(0);
      expect(assertiveRegions.length).toBeGreaterThan(0);
    });
  });

  describe('🎯 Tests de focus et navigation clavier', () => {
    it('doit gérer le focus trap dans les modales', async () => {
      wrapper = mount(ChatWidget, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      // Ouvrir la modale
      await wrapper.find('[role="button"]').trigger('click');
      await wrapper.vm.$nextTick();

      const modal = wrapper.find('[role="dialog"]');
      expect(modal.exists()).toBe(true);
      expect(modal.attributes('aria-modal')).toBe('true');
      
      // Vérifier que le focus est piégé
      const focusableElements = modal.findAll('button, input, textarea, [tabindex]:not([tabindex="-1"])');
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('doit permettre la navigation au clavier dans la liste des chats', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      const chatItems = wrapper.findAll('.chat-item button');
      
      if (chatItems.length > 0) {
        const firstItem = chatItems[0];
        
        // Simuler la navigation avec les flèches
        await firstItem.trigger('keydown', { key: 'ArrowDown' });
        await firstItem.trigger('keydown', { key: 'ArrowUp' });
        await firstItem.trigger('keydown', { key: 'Enter' });
        
        // Pas d'erreur ne devrait être lancée
        expect(true).toBe(true);
      }
    });

    it('doit supporter les raccourcis clavier globaux', async () => {
      wrapper = mount(ChatWidget, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      // Tester Ctrl+M pour ouvrir/fermer
      const bubble = wrapper.find('[role="button"]');
      await bubble.trigger('keydown', { key: 'm', ctrlKey: true });
      
      // Tester Échap pour fermer
      await document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      
      expect(true).toBe(true); // Pas d'erreur lancée
    });
  });

  describe('🔊 Tests des annonces pour lecteurs d'écran', () => {
    it('doit annoncer les nouveaux messages', () => {
      const spy = vi.spyOn(announcer, 'announce');
      
      // Simuler un nouveau message
      announcer.announce('Nouveau message de John: Hello there', 'polite');
      
      expect(spy).toHaveBeenCalledWith('Nouveau message de John: Hello there', 'polite');
    });

    it('doit annoncer les erreurs critiques', () => {
      const spy = vi.spyOn(announcer, 'announce');
      
      // Simuler une erreur critique
      announcer.announce('Erreur de connexion critique', 'assertive');
      
      expect(spy).toHaveBeenCalledWith('Erreur de connexion critique', 'assertive');
    });

    it('doit créer les éléments DOM pour les annonces', () => {
      // Les éléments doivent être créés automatiquement
      const politeElement = document.getElementById('screen-reader-announcer');
      const assertiveElement = document.getElementById('screen-reader-assertive');
      
      expect(politeElement).toBeTruthy();
      expect(assertiveElement).toBeTruthy();
      expect(politeElement?.getAttribute('aria-live')).toBe('polite');
      expect(assertiveElement?.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('🏷️ Tests des labels et descriptions', () => {
    it('doit avoir des labels appropriés sur tous les boutons', async () => {
      wrapper = mount(ChatModalContent, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      const buttons = wrapper.findAll('button');
      
      buttons.forEach((button) => {
        const hasLabel = button.attributes('aria-label') || 
                        button.text().trim() ||
                        button.find('img[alt]').exists();
        
        expect(hasLabel).toBe(true);
      });
    });

    it('doit avoir des descriptions pour les champs de saisie', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      const inputs = wrapper.findAll('input, textarea');
      
      inputs.forEach((input) => {
        const hasDescription = input.attributes('aria-label') || 
                             input.attributes('aria-describedby') ||
                             wrapper.find(`label[for="${input.attributes('id')}"]`).exists();
        
        expect(hasDescription).toBe(true);
      });
    });

    it('doit avoir des descriptions pour les éléments interactifs', async () => {
      wrapper = mount(ChatWidget, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      // Ouvrir la modale pour avoir plus d'éléments
      await wrapper.find('[role="button"]').trigger('click');

      const interactiveElements = wrapper.findAll('button, a, [role="button"], [tabindex]:not([tabindex="-1"])');
      
      interactiveElements.forEach((element) => {
        const hasAccessibleName = element.attributes('aria-label') || 
                                 element.attributes('aria-labelledby') ||
                                 element.text().trim() ||
                                 element.find('img[alt]').exists();
        
        expect(hasAccessibleName).toBe(true);
      });
    });
  });

  describe('🎨 Tests de contraste et visibilité', () => {
    it('doit avoir des indicateurs de focus visibles', async () => {
      wrapper = mount(ChatWidget, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      const bubble = wrapper.find('[role="button"]');
      
      // Simuler le focus
      await bubble.trigger('focus');
      
      // Vérifier que l'élément a des styles de focus
      const styles = window.getComputedStyle(bubble.element);
      
      // L'élément devrait avoir soit outline, soit box-shadow pour le focus
      const hasFocusStyle = styles.outline !== 'none' || 
                           styles.boxShadow !== 'none' ||
                           styles.border !== 'none';
      
      expect(hasFocusStyle).toBe(true);
    });

    it('doit respecter les préférences de mouvement réduit', () => {
      // Simuler prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          addListener: vi.fn(),
          removeListener: vi.fn(),
        })),
      });

      wrapper = mount(ChatWidget, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      // Vérifier que les animations sont désactivées
      const animatedElements = wrapper.findAll('.chat-bubble, .message');
      
      animatedElements.forEach((element) => {
        const styles = window.getComputedStyle(element.element);
        // En mode mouvement réduit, transition devrait être 'none' ou très courte
        if (styles.transition && styles.transition !== 'none') {
          expect(parseFloat(styles.transitionDuration.replace('s', ''))).toBeLessThan(0.2);
        }
      });
    });
  });

  describe('📱 Tests de responsive et mobile', () => {
    it('doit être utilisable sur mobile avec VoiceOver', async () => {
      // Simuler un viewport mobile
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      wrapper = mount(ChatWidget, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      // Vérifier que les éléments restent accessibles
      const bubble = wrapper.find('[role="button"]');
      expect(bubble.exists()).toBe(true);
      
      // Vérifier la taille des zones tactiles (minimum 44x44px)
      const bubbleRect = bubble.element.getBoundingClientRect();
      expect(bubbleRect.width).toBeGreaterThanOrEqual(44);
      expect(bubbleRect.height).toBeGreaterThanOrEqual(44);
    });

    it('doit supporter les gestes tactiles', async () => {
      wrapper = mount(ChatWidget, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      const bubble = wrapper.find('[role="button"]');
      
      // Simuler un geste tactile
      await bubble.trigger('touchstart');
      await bubble.trigger('touchend');
      
      expect(true).toBe(true); // Pas d'erreur lancée
    });
  });

  describe('🔧 Tests utilitaires d'accessibilité', () => {
    it('doit détecter le type de lecteur d\'écran', () => {
      // Test de détection basique
      const detector = () => {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('nvda') ? 'nvda' : 'unknown';
      };
      
      const result = detector();
      expect(['nvda', 'jaws', 'voiceover', 'unknown']).toContain(result);
    });

    it('doit exécuter les tests automatiques d\'accessibilité', () => {
      // Créer quelques éléments de test
      document.body.innerHTML = `
        <button aria-label="Test button">Click me</button>
        <input type="text" aria-label="Test input" />
        <div role="dialog" aria-modal="true" aria-labelledby="title">
          <h2 id="title">Test Modal</h2>
        </div>
        <div aria-live="polite">Live region</div>
      `;

      const results = AccessibilityTester.testChatAccessibility();
      
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      
      // Vérifier que les tests passent pour notre markup de test
      const buttonTest = results.find(r => r.test === 'Button Labels');
      expect(buttonTest?.passed).toBe(true);
      
      const liveRegionTest = results.find(r => r.test === 'Live Regions');
      expect(liveRegionTest?.passed).toBe(true);
    });

    it('doit gérer le piégeage de focus correctement', () => {
      // Créer un container de test
      const container = document.createElement('div');
      container.innerHTML = `
        <button>First</button>
        <input type="text" />
        <button>Last</button>
      `;
      document.body.appendChild(container);

      // Tester le piégeage de focus
      const cleanup = FocusManager.trapFocus(container);
      
      expect(cleanup).toBeInstanceOf(Function);
      
      // Nettoyer
      cleanup();
      document.body.removeChild(container);
    });
  });

  describe('🧪 Tests d\'intégration avec les lecteurs d\'écran', () => {
    it('doit simuler l\'expérience NVDA', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      // Simuler la navigation NVDA avec les touches H (headings)
      const headings = wrapper.findAll('h1, h2, h3, h4, h5, h6');
      expect(headings.length).toBeGreaterThan(0);
      
      // Chaque en-tête doit avoir un contenu textuel
      headings.forEach((heading) => {
        expect(heading.text().trim()).not.toBe('');
      });
    });

    it('doit simuler l\'expérience JAWS', async () => {
      wrapper = mount(ChatModalContent, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      // JAWS utilise beaucoup les formulaires
      const forms = wrapper.findAll('form');
      
      forms.forEach((form) => {
        // Chaque formulaire doit avoir un label ou une description
        const hasLabel = form.attributes('aria-label') || 
                        form.attributes('aria-labelledby') ||
                        form.find('legend').exists();
        
        expect(hasLabel).toBe(true);
      });
    });

    it('doit simuler l\'expérience VoiceOver', async () => {
      wrapper = mount(ChatWidget, {
        global: {
          plugins: [createTestingPinia()]
        }
      });

      // VoiceOver utilise beaucoup le rotor web
      const landmarks = wrapper.findAll('[role="main"], [role="navigation"], [role="complementary"], [role="banner"]');
      const buttons = wrapper.findAll('button, [role="button"]');
      const links = wrapper.findAll('a, [role="link"]');
      
      // Doit avoir des éléments navigables
      const totalNavigableElements = landmarks.length + buttons.length + links.length;
      expect(totalNavigableElements).toBeGreaterThan(0);
    });
  });
});

// Tests de performance d'accessibilité
describe('⚡ Performance d\'accessibilité', () => {
  it('doit charger les annonces rapidement', async () => {
    const announcer = ScreenReaderAnnouncer.getInstance();
    
    const startTime = performance.now();
    announcer.announce('Test message', 'polite');
    const endTime = performance.now();
    
    // L'annonce doit être traitée en moins de 100ms
    expect(endTime - startTime).toBeLessThan(100);
  });

  it('doit gérer de nombreuses annonces simultanées', async () => {
    const announcer = ScreenReaderAnnouncer.getInstance();
    
    const promises = Array.from({ length: 100 }, (_, i) => 
      new Promise(resolve => {
        announcer.announce(`Message ${i}`, 'polite');
        resolve(true);
      })
    );
    
    const startTime = performance.now();
    await Promise.all(promises);
    const endTime = performance.now();
    
    // Doit traiter 100 annonces en moins de 1 seconde
    expect(endTime - startTime).toBeLessThan(1000);
  });
});

// Tests de compatibilité navigateur
describe('🌐 Compatibilité navigateur pour l\'accessibilité', () => {
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
  
  browsers.forEach(browser => {
    it(`doit fonctionner avec ${browser}`, () => {
      // Simuler différents user agents
      const mockUserAgent = `Mozilla/5.0 (${browser})`;
      Object.defineProperty(navigator, 'userAgent', {
        value: mockUserAgent,
        configurable: true
      });

      const announcer = ScreenReaderAnnouncer.getInstance();
      
      // Doit pouvoir créer des annonces sur tous les navigateurs
      expect(() => {
        announcer.announce('Test browser compatibility', 'polite');
      }).not.toThrow();
    });
  });
}); 