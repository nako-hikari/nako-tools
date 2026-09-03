const fs = require('fs');
const path = require('path');

function toDisplayName(folderName) {
  return folderName
    .replace(/[-_]+/g, ' ')      // turn - and _ into " " forgot what's it called 
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const folderName = entry.name;
        const folderPath = path.join(toolsDir, folderName);
        const indexPath = path.join(folderPath, 'index.html');

        // Skip folders that don't actually contain a index
        if (!fs.existsSync(indexPath)) return null;

        let dateAdded = null;
        let hasExplicitDate = false;

        // open meta.json inside the tool folder for dates
        const metaPath = path.join(folderPath, 'meta.json');
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            if (meta.dateAdded) {
              dateAdded = new Date(meta.dateAdded).toISOString();
              hasExplicitDate = true;
            }
          } catch (err) {
            // ignore not writed or missing meta.json, fall back to file timestamp
          }
        }

        if (!dateAdded) {
          const stat = fs.statSync(indexPath);
          dateAdded = stat.mtime.toISOString();
        }

        return {
          folder: folderName,
          name: toDisplayName(folderName),
          path: `/tools/${folderName}/index.html`,
          dateAdded,
          hasExplicitDate,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ tools });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
