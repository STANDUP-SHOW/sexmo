const express = require('express');
const prisma = require('../config/prisma');

const router = express.Router();

async function getSettings() {
  return prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  });
}

router.get('/', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json({
      siteName: settings.siteName,
      tagline: settings.tagline,
      logoUrl: settings.logoUrl,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.getSettings = getSettings;
