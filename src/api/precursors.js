export async function listPrecursors() {
  const res = await fetch('/api/precursors');
  if (!res.ok) throw new Error('Failed to fetch precursors');
  return res.json();
}

export async function getPrecursor(id) {
  const res = await fetch(`/api/precursors/${id}`);
  if (!res.ok) throw new Error('Failed to fetch precursor');
  return res.json();
}

export async function createPrecursor(data) {
  const res = await fetch('/api/precursors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create precursor');
  return res.json();
}

export async function updatePrecursor(id, data) {
  const res = await fetch(`/api/precursors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update precursor');
  return res.json();
}

export async function deletePrecursor(id) {
  const res = await fetch(`/api/precursors/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete precursor');
}
