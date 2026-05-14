'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin-client';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'ezzahcomm@gmail.com';

export async function createProject(formData: FormData) {
  const db = createAdminClient();

  let   tenantId    = formData.get('tenant_id') as string;
  const tenantEmail = formData.get('tenant_email') as string;
  const tenantName  = formData.get('tenant_name') as string;
  const name        = formData.get('name') as string;
  const description = formData.get('description') as string;
  const needs       = formData.get('needs') as string;
  const githubUrl   = formData.get('github_url') as string;
  const agentsRaw   = formData.get('agents') as string;
  const files       = formData.getAll('files') as File[];

  const agentDefs: {
    name: string;
    type: string;
    capabilities: string[];
    tasks: { type: string; title: string; priority: string }[];
    instructions: string;
  }[] = JSON.parse(agentsRaw || '[]');

  if (!tenantEmail || !name || !agentDefs.length) {
    redirect('/admin/projects/new?error=Missing+required+fields');
  }

  // Find or create tenant
  if (!tenantId) {
    const { data: existing } = await db
      .from('tenants')
      .select('id')
      .eq('email', tenantEmail)
      .maybeSingle();

    if (existing) {
      tenantId = existing.id;
    } else {
      const { data: newTenant, error: tenantErr } = await db
        .from('tenants')
        .insert({ name: tenantName || tenantEmail.split('@')[0], email: tenantEmail })
        .select('id')
        .single();
      if (tenantErr || !newTenant) {
        redirect(`/admin/projects/new?error=${encodeURIComponent(tenantErr?.message ?? 'Failed to create tenant')}`);
      }
      tenantId = newTenant.id;
    }
  }

  // Upload files to Supabase Storage
  const fileUrls: { name: string; path: string; size: number; type: string }[] = [];
  const validFiles = files.filter(f => f && f.size > 0).slice(0, 4);
  for (const file of validFiles) {
    const path = `${tenantId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const bytes = await file.arrayBuffer();
    const { error: upErr } = await db.storage
      .from('project-files')
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (!upErr) {
      fileUrls.push({ name: file.name, path, size: file.size, type: file.type });
    }
  }

  // Create project
  const { data: project, error: projErr } = await db
    .from('projects')
    .insert({
      tenant_id:    tenantId,
      name,
      description,
      needs,
      github_url:   githubUrl || null,
      file_urls:    fileUrls,
      initiated_by: ADMIN_EMAIL,
    })
    .select('id')
    .single();

  if (projErr || !project) {
    redirect(`/admin/projects/new?error=${encodeURIComponent(projErr?.message ?? 'Failed to create project')}`);
  }

  // Create agents
  const agentRows = agentDefs.map(a => ({
    tenant_id:    tenantId,
    project_id:   project.id,
    name:         a.name,
    type:         a.type,
    capabilities: a.capabilities,
    status:       'idle',
  }));
  const { data: insertedAgents, error: agentErr } = await db
    .from('agents')
    .insert(agentRows)
    .select('id, type');

  if (agentErr) {
    redirect(`/admin/projects/new?error=${encodeURIComponent(agentErr.message)}`);
  }

  // Create tasks for each agent
  const taskRows = agentDefs.flatMap((a, i) => {
    const agentId = insertedAgents?.[i]?.id;
    return a.tasks.map(t => ({
      tenant_id:  tenantId,
      project_id: project.id,
      task_type:  t.type,
      title:      t.title,
      priority:   t.priority,
      status:     'pending',
      payload:    {
        agent_type:   a.type,
        agent_id:     agentId ?? null,
        instructions: a.instructions || null,
        github_url:   githubUrl || null,
      },
    }));
  });

  if (taskRows.length) {
    await db.from('tasks').insert(taskRows);
  }

  await db.from('audit_logs').insert({
    actor_email: ADMIN_EMAIL,
    action:      'project.created',
    resource:    'projects',
    resource_id: project.id,
    diff: {
      name,
      tenant_email:  tenantEmail,
      agent_count:   agentRows.length,
      task_count:    taskRows.length,
      files_uploaded: fileUrls.length,
      github_url:    githubUrl || null,
    },
  });

  redirect('/admin/projects');
}
