const ftp = require('basic-ftp');
const { Readable, PassThrough } = require('stream');

// Stockage des photos/vidéos sur le serveur FTP OVH du site plutôt que sur le
// disque du backend (qui, sur Railway, est éphémère et limité). Chaque
// opération ouvre sa propre connexion FTP le temps de l'appel puis la ferme :
// plus simple et plus robuste qu'un pool partagé pour le volume attendu ici,
// quitte à être un peu moins rapide qu'une connexion persistante.

function required(name) {
  const value = process.env[name];
  if (!value) {
    const err = new Error(`Variable d'environnement manquante : ${name} (stockage FTP non configuré)`);
    err.status = 503;
    err.expose = true;
    throw err;
  }
  return value;
}

async function withClient(fn) {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access({
      host: required('FTP_HOST'),
      port: Number(process.env.FTP_PORT || 21),
      user: required('FTP_USER'),
      password: required('FTP_PASSWORD'),
      secure: process.env.FTP_SECURE === 'true',
    });
    const remoteDir = process.env.FTP_REMOTE_DIR || '/uploads';
    await client.ensureDir(remoteDir);
    return await fn(client, remoteDir);
  } finally {
    client.close();
  }
}

async function uploadBuffer(buffer, filename) {
  return withClient(async (client, remoteDir) => {
    await client.uploadFrom(Readable.from(buffer), `${remoteDir}/${filename}`);
  });
}

// Retourne un stream Node lisible : le fichier est téléchargé du FTP en
// arrière-plan et poussé dans un PassThrough, que l'appelant peut directement
// .pipe() vers la réponse HTTP sans attendre que tout le fichier soit en RAM.
function downloadStream(filename) {
  const pass = new PassThrough();
  withClient(async (client, remoteDir) => {
    await client.downloadTo(pass, `${remoteDir}/${filename}`);
  })
    .catch((err) => pass.destroy(err))
    .finally(() => pass.end());
  return pass;
}

async function deleteFile(filename) {
  return withClient(async (client, remoteDir) => {
    try {
      await client.remove(`${remoteDir}/${filename}`);
    } catch (err) {
      // Fichier déjà absent : pas bloquant pour une suppression.
      if (!/no such file|550/i.test(err.message || '')) throw err;
    }
  });
}

module.exports = { uploadBuffer, downloadStream, deleteFile };
