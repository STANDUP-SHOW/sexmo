const Anthropic = require('@anthropic-ai/sdk');

let client;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

// Suggère soit un message d'ouverture (conversation vide, juste après un
// match), soit une relance (conversation déjà entamée) — l'utilisateur
// choisit une suggestion et peut la modifier avant envoi, rien n'est envoyé
// automatiquement en son nom.
async function generateConversationSuggestions({ myProfile, otherProfile, recentMessages }) {
  const anthropic = getClient();
  if (!anthropic) {
    const err = new Error('Assistant IA indisponible pour le moment.');
    err.status = 503;
    err.expose = true;
    throw err;
  }

  const isOpening = recentMessages.length === 0;

  const context = isOpening
    ? `${myProfile.pseudo} (${myProfile.city}) vient de matcher avec ${otherProfile.pseudo} (${otherProfile.city}) sur une application de rencontre. Bio de ${otherProfile.pseudo} : "${otherProfile.bio || 'non renseignée'}". Centres d'intérêt de ${otherProfile.pseudo} : ${(otherProfile.interests || []).join(', ') || 'non renseignés'}.`
    : `Voici les derniers messages échangés entre ${myProfile.pseudo} et ${otherProfile.pseudo} sur une application de rencontre (du plus ancien au plus récent) :\n${recentMessages
        .map((m) => `${m.senderProfileId === myProfile.id ? myProfile.pseudo : otherProfile.pseudo} : ${m.content}`)
        .join('\n')}`;

  const instruction = isOpening
    ? `Propose 3 messages d'ouverture courts (1 à 2 phrases chacun), en français, qui donnent envie de répondre.`
    : `Propose 3 messages courts (1 à 2 phrases chacun), en français, que ${myProfile.pseudo} pourrait envoyer pour relancer ou faire avancer la conversation naturellement.`;

  let message;
  try {
    message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `${context}\n\n${instruction}\n\nConsignes strictes : ton chaleureux et respectueux, AUCUN contenu à caractère sexuel explicite, n'invente aucune information personnelle qui ne figure pas ci-dessus. Réponds uniquement avec les 3 suggestions, une par ligne, sans numérotation ni guillemets.`,
        },
      ],
    });
  } catch (apiErr) {
    const err = new Error("La suggestion IA a échoué, réessayez dans un instant.");
    err.status = 502;
    err.expose = true;
    throw err;
  }

  const textBlock = message.content.find((b) => b.type === 'text');
  return (textBlock?.text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
}

module.exports = { generateConversationSuggestions };
