function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  return headers;
}

export const api = {
  get: async (path: string) => {
    const r = await fetch(`/api${path}`, { headers: getHeaders(), credentials: 'include' });
    if (!r.ok) throw new Error(`GET ${path} failed: ${r.status}`);
    return r.json();
  },
  post: async (path: string, body?: unknown) => {
    const r = await fetch(`/api${path}`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(`POST ${path} failed: ${r.status}`);
    return r.json();
  },
  put: async (path: string, body: unknown) => {
    const r = await fetch(`/api${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`PUT ${path} failed: ${r.status}`);
    return r.json();
  },
};
