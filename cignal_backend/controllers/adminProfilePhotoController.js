const { validateProfilePhoto, findPhoto, writePhoto, removePhoto } = require('../services/adminProfilePhotoService');
async function getProfilePhoto(req, res) {
  try {
    const photo = await findPhoto(req.user.id);
    if (!photo) return res.status(404).json({ error: 'This administrator has no profile photo yet.' });
    const buffer = Buffer.from(photo.image_base64, 'base64');
    res.setHeader('Content-Type', photo.mime_type);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Length', String(buffer.length));
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to retrieve the administrator photo.' });
  }
}
async function saveProfilePhoto(req, res) {
  try {
    let photo;
    try { photo = validateProfilePhoto(req.body?.dataUrl); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    await writePhoto(req.user.id, photo);
    return res.json({ message: 'Administrator profile photo saved.' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to save administrator profile photo.' });
  }
}
async function deleteProfilePhoto(req, res) {
  try { await removePhoto(req.user.id); return res.json({ message: 'Profile photo removed.' }); }
  catch (error) { return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to remove administrator profile photo.' }); }
}
module.exports = { getProfilePhoto, saveProfilePhoto, deleteProfilePhoto };
