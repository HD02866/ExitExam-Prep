import { Suspense } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading password reset...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
