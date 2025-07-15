const sgMail = require('@sendgrid/mail');

async function testSendGridAPI() {
  console.log('🧪 TEST SENDGRID API - Remplacement SMTP');
  console.log('=======================================');
  console.log('');

  const apiKey = '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';
  
  try {
    console.log('📧 Configuration SendGrid API...');
    sgMail.setApiKey(apiKey);
    console.log('✅ API Key configurée');
    console.log('');

    console.log('📤 Envoi de test...');
    const msg = {
      to: 'ghlisyouri@gmail.com', // Remplacez par votre email
      from: 'École <noreply@educareschool.me>',
      subject: 'Test SendGrid API - Plus de SMTP !',
      html: `
        <h2>🎉 SendGrid API fonctionne !</h2>
        <p>Excellent ! L'API SendGrid remplace SMTP avec succès.</p>
        <ul>
          <li>✅ Plus de problèmes de ports SMTP bloqués</li>
          <li>✅ Plus d'erreurs ETIMEDOUT</li>
          <li>✅ Communication HTTP fiable</li>
          <li>✅ Parfait pour les serveurs cloud</li>
        </ul>
        <p><strong>Les invitations vont enfin fonctionner en production !</strong></p>
      `,
    };

    const response = await sgMail.send(msg);
    
    console.log('🎉 EMAIL ENVOYÉ AVEC SUCCÈS !');
    console.log(`   Status: ${response[0].statusCode}`);
    console.log(`   Message ID: ${response[0].headers['x-message-id']}`);
    console.log('');
    
    console.log('✅ SOLUTION CONFIRMÉE:');
    console.log('======================');
    console.log('• API SendGrid fonctionne parfaitement');
    console.log('• Plus de dépendance aux ports SMTP');
    console.log('• Compatible avec DigitalOcean et autres clouds');
    console.log('• Les invitations vont fonctionner en production');
    console.log('');
    
  } catch (error) {
    console.error('❌ ERREUR:', error);
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    console.error('   Response:', error.response?.body || 'No response body');
  }
}

testSendGridAPI(); 