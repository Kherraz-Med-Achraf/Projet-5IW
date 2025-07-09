// Script de debug pour tester l'API blog
// À exécuter dans la console du navigateur

console.log('=== DEBUG BLOG API ===');

// Test de l'API blog
async function testBlogAPI() {
  try {
    const token = localStorage.getItem('token');
    console.log('Token trouvé:', !!token);
    
    const response = await fetch('https://api.educareschool.me/blog', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Posts récupérés:', data);
    console.log('Nombre de posts:', data.length);
    
    if (data.length > 0) {
      console.log('Premier post:', data[0]);
      console.log('Structure du premier post:', Object.keys(data[0]));
      
      if (data[0].author) {
        console.log('Auteur du premier post:', data[0].author);
        console.log('Structure auteur:', Object.keys(data[0].author));
      } else {
        console.log('PROBLÈME: Pas d\'auteur dans le premier post');
      }
    }
    
  } catch (error) {
    console.error('Erreur lors du test API:', error);
  }
}

// Test du store Pinia
async function testBlogStore() {
  try {
    console.log('\n=== TEST BLOG STORE ===');
    
    // Accéder au store
    const app = document.querySelector('#app').__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    
    if (!pinia) {
      console.error('Pinia non trouvé');
      return;
    }
    
    // Récupérer le store blog
    const blogStore = pinia._s.get('blog');
    
    if (!blogStore) {
      console.error('BlogStore non trouvé');
      return;
    }
    
    console.log('BlogStore trouvé:', blogStore);
    console.log('Posts dans le store:', blogStore.posts);
    console.log('Loading:', blogStore.loading);
    console.log('Error:', blogStore.error);
    
    // Tester fetchPosts
    console.log('Test de fetchPosts...');
    await blogStore.fetchPosts();
    
    console.log('Après fetchPosts:');
    console.log('Posts:', blogStore.posts);
    console.log('Loading:', blogStore.loading);
    console.log('Error:', blogStore.error);
    
  } catch (error) {
    console.error('Erreur lors du test store:', error);
  }
}

// Lancer les tests
testBlogAPI();
setTimeout(testBlogStore, 2000);

console.log('Script de debug lancé. Vérifiez les logs ci-dessus.'); 