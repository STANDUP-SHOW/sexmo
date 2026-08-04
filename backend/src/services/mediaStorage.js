// Pilote de stockage sélectionnable par variable d'environnement :
// - "local" (par défaut) : disque du serveur, simple pour démarrer.
// - "ftp"   : serveur FTP OVH (voir ftpStorage.js), à activer plus tard une
//   fois les limites de l'hébergement (200 Go) et son organisation connues —
//   il suffira de régler STORAGE_DRIVER=ftp et les variables FTP_* associées,
//   sans changer aucune route.
// Même interface des deux côtés : uploadBuffer(buffer, filename),
// downloadStream(filename), deleteFile(filename).
const driver = process.env.STORAGE_DRIVER === 'ftp' ? require('./ftpStorage') : require('./localStorage');

module.exports = driver;
