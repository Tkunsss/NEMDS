const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const backendRoutesDir = path.join(root, 'backend', 'routes');
const appsRoot = path.join(root, 'apps');

function walk(dir) {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) files.push(...walk(p));
    else files.push(p);
  }
  return files;
}

const routeFiles = walk(backendRoutesDir).filter((p) => p.endsWith('.js'));
const appFiles = walk(appsRoot).filter((p) => p.endsWith('.js') || p.endsWith('.jsx'));

const endpointMap = {};
for (const routeFile of routeFiles) {
  const content = fs.readFileSync(routeFile, 'utf8');
  const regex = /router\.(get|post|patch|delete)\('([^']+)'/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    const route = m[2];
    endpointMap[`${method} ${route}`] = {
      file: path.relative(root, routeFile),
      route,
      used: new Set()
    };
  }
}

for (const file of appFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [endpoint, info] of Object.entries(endpointMap)) {
    const route = info.route;
    const base = route.replace(/:[^/]+/g, '');
    if (!base) continue;
    if (text.includes(base) || text.includes(route)) {
      info.used.add(path.relative(root, file));
    }
  }
}

for (const [endpoint, info] of Object.entries(endpointMap).sort()) {
  if (info.used.size === 0) {
    console.log('UNUSED', endpoint, 'defined in', info.file);
  } else {
    console.log('USED', endpoint, 'in', info.used.size, 'files');
  }
}
