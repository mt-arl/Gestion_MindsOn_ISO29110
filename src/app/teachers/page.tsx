import React from 'react';
import { Header } from '@/components/Header';
import { TeachersView } from '@/components/TeachersView';
import { getTeachersList } from '@/actions/teachers';

export const dynamic = 'force-dynamic';

export default async function TeachersPage() {
  const teachers = await getTeachersList();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <TeachersView initialTeachers={teachers} />
      </main>
    </div>
  );
}
