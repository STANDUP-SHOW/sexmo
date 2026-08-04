const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

// Stockage disque classique du serveur backend. Simple pour démarrer, mais
// éphémère sur un hébergeur comme Railway sans volume persistant (voir
// DEPLOY.md) — c'est justement ce que ftpStorage.js est prêt à remplacer
// plus tard (voir mediaStorage.js) une fois les limites du FTP OVH connues.
const baseDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads', 'media');
fs.mkdirSync(baseDir, { recursive: true });

async function uploadBuffer(buffer, filename) {
  await fsp.writeFile(path.join(baseDir, filename), buffer);
}

function downloadStream(filename) {
  return fs.createReadStream(path.join(baseDir, filename));
}

async function deleteFile(filename) {
  try {
    await fsp.unlink(path.join(baseDir, filename));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

module.exports = { uploadBuffer, downloadStream, deleteFile };
