import { createClient } from '@/lib/supabase/server';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { EditProjectForm } from './edit-form';

export const instant = false;

interface EditProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  await connection();
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !project) {
    notFound();
  }

  return <EditProjectForm project={project} />;
}
