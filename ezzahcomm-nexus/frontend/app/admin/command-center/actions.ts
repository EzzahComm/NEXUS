'use server';

const API = process.env.NEXUS_API_URL ?? 'http://localhost:4000';
const API_KEY = process.env.NEXUS_INTERNAL_KEY ?? '';

export async function orchestrateTeam(input: {
  objective: string;
  mode: string;
  project_id?: string;
}): Promise<{ teamId?: string; error?: string }> {
  try {
    const res = await fetch(`${API}/api/teams/orchestrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        objective: input.objective,
        context: {},
        mode: input.mode,
        project_id: input.project_id,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      return { error: err.error ?? `API error ${res.status}` };
    }

    const data = await res.json();
    return { teamId: data.team?.id };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function dissolveTeam(teamId: string): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${API}/api/teams/${teamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (!res.ok) return { error: `API error ${res.status}` };
    return {};
  } catch (err) {
    return { error: String(err) };
  }
}
