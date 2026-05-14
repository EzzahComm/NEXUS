import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from './Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) redirect('/auth/login');

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar user={data.claims} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
