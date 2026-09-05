const fs = require('fs');
const path = require('path');

const EIGHT_YEARS_MS = 8 * 365.25 * 24 * 60 * 60 * 1000;

function toDisplayName(folderName) {
  return folderName
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function readMetaDate(folderPath) {
  const metaPath = path.join(folderPath, 'meta.json');
  if (!fs.existsSync(metaPath)) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (meta.dateAdded) return new Date(meta.dateAdded).toISOString();
  } catch (err) {

  }
  return null;
}

function scanDir(dirPath, folderName, relPath) {
  const indexPath = path.join(dirPath, 'index.html');

  if (fs.existsSync(indexPath)) {
    return {
      type: 'tool',
      folder: folderName,
      name: toDisplayName(folderName),
      path: `/tools/${relPath}/index.html`,
      dateAdded: readMetaDate(dirPath) || new Date(Date.now() - EIGHT_YEARS_MS).toISOString(),
    };
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const children = entries
    .filter(e => e.isDirectory())
    .map(e => scanDir(path.join(dirPath, e.name), e.name, `${relPath}/${e.name}`))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    type: 'category',
    folder: folderName,
    name: toDisplayName(folderName),
    dateAdded: readMetaDate(dirPath) || new Date(Date.now() - EIGHT_YEARS_MS).toISOString(),
    children,
  };
}

module.exports = (req, res) => {
  try {
    const toolsDir = path.join(process.cwd(), 'tools');

    if (!fs.existsSync(toolsDir)) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ tools: [] });
    }

    const entries = fs.readdirSync(toolsDir, { withFileTypes: true });
    const tools = entries
      .filter(e => e.isDirectory())
      .map(e => scanDir(path.join(toolsDir, e.name), e.name, e.name))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ tools });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
