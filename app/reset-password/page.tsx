import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ResetPasswordForm } from './_components/reset-password-form';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/dashboard');
  return <ResetPasswordForm />;
}
