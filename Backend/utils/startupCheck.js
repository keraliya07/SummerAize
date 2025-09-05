const mongoose = require('mongoose');

function getRouteList(app) {
  const routes = [];
  if (!app || !app._router || !app._router.stack) return routes;
  app._router.stack.forEach(layer => {
    if (layer.route && layer.route.path && layer.route.methods) {
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      routes.push({ methods, path: layer.route.path });
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      layer.handle.stack.forEach(r => {
        if (r.route && r.route.path && r.route.methods) {
          const methods = Object.keys(r.route.methods).map(m => m.toUpperCase());
          routes.push({ methods, path: r.route.path });
        }
      });
    }
  });
  return routes;
}

function printSection(title) {
  const line = ''.padEnd(30, '=');
  console.log(`${line} ${title} ${line}`);
}

async function runStartupChecks(app) {
  printSection('Startup Verification');

  console.log('Node:', process.version);
  console.log('Env: production=', process.env.NODE_ENV === 'production');

  const required = ['PORT', 'MONGODB_URI'];
  const missing = required.filter(k => !process.env[k] || String(process.env[k]).trim() === '');
  console.log('Env Vars Required:', required.join(', '));
  console.log('Env Vars Present:', required.filter(k => !missing.includes(k)).join(', ') || 'none');
  if (missing.length) console.log('Env Vars Missing:', missing.join(', '));

  const state = mongoose.connection.readyState;
  const stateText = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }[state] || 'unknown';
  console.log('MongoDB State:', stateText);
  if (mongoose.connection.host) console.log('MongoDB Host:', mongoose.connection.host);
  if (mongoose.connection.name) console.log('MongoDB DB:', mongoose.connection.name);

  const routes = getRouteList(app);
  console.log('Routes Count:', routes.length);
  routes.forEach(r => console.log(`${r.methods.join(',')} ${r.path}`));

  printSection('Verification Complete');
}

module.exports = { runStartupChecks };

