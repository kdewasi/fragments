const fs = require('fs').promises;
const path = require('path');

const baseDir = path.join(__dirname, '..', '..', '..', 'model', 'data', 'fragments');

async function ensureDir(ownerId) {
  const dir = path.join(baseDir, ownerId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function writeFragment(fragment) {
  const dir = await ensureDir(fragment.ownerId);
  const file = path.join(dir, `${fragment.id}.json`);
  await fs.writeFile(file, JSON.stringify(fragment, null, 2));
}

async function readFragment(ownerId, id) {
  try {
    const file = path.join(baseDir, ownerId, `${id}.json`);
    const data = await fs.readFile(file);
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function writeFragmentData(ownerId, id, data) {
  const dir = await ensureDir(ownerId);
  const file = path.join(dir, `${id}.data`);
  await fs.writeFile(file, data);
}

async function readFragmentData(ownerId, id) {
  const file = path.join(baseDir, ownerId, `${id}.data`);
  return fs.readFile(file);
}

async function listFragments(ownerId, expand = false) {
  try {
    const dir = path.join(baseDir, ownerId);
    const files = await fs.readdir(dir);
    const fragmentFiles = files.filter(f => f.endsWith('.json'));
    if (expand) {
      const fragments = await Promise.all(fragmentFiles.map(f => {
        const filePath = path.join(dir, f);
        return fs.readFile(filePath).then(data => JSON.parse(data));
      }));
      return fragments;
    }
    return fragmentFiles.map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

async function deleteFragment(ownerId, id) {
  try {
    const jsonFile = path.join(baseDir, ownerId, `${id}.json`);
    const dataFile = path.join(baseDir, ownerId, `${id}.data`);
    await fs.unlink(jsonFile);
    await fs.unlink(dataFile);
  } catch {
    // Ignore if files don't exist
  }
}

module.exports = {
  writeFragment,
  readFragment,
  writeFragmentData,
  readFragmentData,
  listFragments,
  deleteFragment,
};
