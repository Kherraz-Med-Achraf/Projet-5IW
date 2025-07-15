const fs = require('fs');
const path = require('path');

// Stores à mettre à jour
const storesToUpdate = [
  'frontend/src/stores/childStore.ts',
  'frontend/src/stores/presenceStore.ts',
  'frontend/src/stores/register.ts',
  'frontend/src/stores/secretary.ts',
  'frontend/src/stores/service-manager.ts',
  'frontend/src/stores/staff.ts',
  'frontend/src/stores/director.ts',
  'frontend/src/stores/parent.ts',
  'frontend/src/stores/chatStore.ts',
  'frontend/src/stores/child.ts',
];

function updateStoreFile(filePath) {
  console.log(`🔄 Mise à jour de ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Fichier non trouvé : ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Ajouter l'import des utilitaires API sécurisés
  const importRegex = /import.*from.*['"]pinia['"];?\s*\n/;
  const secureImport = "import { secureApiCall, secureJsonCall, API_BASE_URL } from '@/utils/api'\n";
  
  if (!content.includes("from '@/utils/api'")) {
    content = content.replace(importRegex, (match) => match + secureImport);
    modified = true;
  }

  // 2. Remplacer les URLs hardcodées par API_BASE_URL
  content = content.replace(/http:\/\/localhost:3000/g, '${API_BASE_URL}');
  content = content.replace(/https:\/\/localhost:3000/g, '${API_BASE_URL}');
  content = content.replace(/`localhost:3000/g, '`${API_BASE_URL}');
  
  // 3. Remplacer les appels fetch GET par secureJsonCall
  content = content.replace(
    /const\s+(\w+)\s*=\s*await\s+fetch\(([^,]+),\s*{\s*headers:\s*{\s*[^}]*Authorization[^}]*\s*}\s*}\)/g,
    'const $1 = await secureJsonCall($2)'
  );

  // 4. Remplacer les appels fetch POST/PUT/PATCH/DELETE par secureJsonCall
  content = content.replace(
    /const\s+(\w+)\s*=\s*await\s+fetch\(([^,]+),\s*{\s*method:\s*['"]([^'"]+)['"],\s*headers:\s*{[^}]*Authorization[^}]*},\s*body:\s*([^}]+)\s*}\)/g,
    'const $1 = await secureJsonCall($2, { method: \'$3\', body: $4 })'
  );

  // 5. Remplacer les appels fetch simples pour POST/PUT/PATCH/DELETE
  content = content.replace(
    /await\s+fetch\(([^,]+),\s*{\s*method:\s*['"]([^'"]+)['"],\s*headers:\s*{[^}]*Authorization[^}]*}[^}]*}\)/g,
    'await secureApiCall($1, { method: \'$2\' })'
  );

  // 6. Supprimer les imports inutiles d'useAuthStore si plus utilisés
  if (!content.includes('useAuthStore()')) {
    content = content.replace(/import\s*{\s*useAuthStore\s*}\s*from\s*['"][^'"]*['"];\s*\n/, '');
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath} mis à jour !`);
  } else {
    console.log(`ℹ️ ${filePath} déjà à jour`);
  }
}

// Exécuter la mise à jour
console.log('🚀 Démarrage de la mise à jour des stores...\n');

storesToUpdate.forEach(updateStoreFile);

console.log('\n✨ Mise à jour terminée !'); 