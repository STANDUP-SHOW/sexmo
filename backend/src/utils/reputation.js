const prisma = require('../config/prisma');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Tous les indicateurs ci-dessous sont dérivés de données déjà présentes en
// base (matchs, messages, signalements confirmés) — aucune donnée nouvelle
// à collecter, aucun modèle prédictif.
async function computeReputation(profile) {
  const matches = await prisma.match.findMany({
    where: { OR: [{ profileAId: profile.id }, { profileBId: profile.id }] },
    include: { conversation: { include: { messages: { select: { senderProfileId: true } } } } },
  });

  const conversations = matches.map((m) => m.conversation).filter(Boolean);
  const totalConversations = conversations.length;
  const respondedConversations = conversations.filter((c) =>
    c.messages.some((msg) => msg.senderProfileId === profile.id)
  ).length;
  const responseRatePct = totalConversations > 0 ? Math.round((respondedConversations / totalConversations) * 100) : null;

  const actionTakenReports = await prisma.report.count({
    where: { targetUserId: profile.userId, status: 'ACTION_TAKEN' },
  });

  const accountAgeDays = Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / MS_PER_DAY);

  const exemplary = accountAgeDays >= 30 && actionTakenReports === 0 && (responseRatePct === null || responseRatePct >= 50);

  return { accountAgeDays, responseRatePct, exemplary };
}

module.exports = { computeReputation };
