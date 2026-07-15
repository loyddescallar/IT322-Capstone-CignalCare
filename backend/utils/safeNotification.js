async function notifySafely(label, callback) {
  try {
    await callback();
    return true;
  } catch (error) {
    console.error(`${label} NOTIFICATION ERROR:`, error.message);
    return false;
  }
}

module.exports = { notifySafely };
