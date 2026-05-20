import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from './AdminSidebar';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'ezzahcomm@gmail.com';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) redirect('/admin/login');
  if ((data.claims.email as string) !== ADMIN_EMAIL) redirect('/dashboard');

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-slate-950">{children}</main>
    </div>
  );
}
