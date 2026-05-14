'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createAgent(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) throw new Error('Not authenticated');

  const email = auth.claims.email as string;

  // Find or create tenant for this user
  let { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('email', email)
    .single();

  if (!tenant) {
    const { data: newTenant, error } = await supabase
      .from('tenants')
      .insert({ name: email.split('@')[0], email, plan: 'starter', status: 'active' })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    tenant = newTenant;
  }

  const name         = formData.get('name') as string;
  const type         = formData.get('type') as string;
  const capabilities = JSON.parse(formData.get('capabilities') as string ?? '[]');

  const { error } = await supabase.from('agents').insert({
    tenant_id:    tenant!.id,
    name,
    type,
    capabilities,
    status: 'idle',
  });

  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/agents');
}
