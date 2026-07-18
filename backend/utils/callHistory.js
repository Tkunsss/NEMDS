function resolveCallListScope(status) {
  if (status === 'history') return { kind: 'history' };
  if (status === 'active') return { kind: 'active' };
  if (status === 'pending') return { kind: 'pending' };
  return { kind: 'all' };
}

module.exports = { resolveCallListScope };
