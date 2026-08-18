import React from 'react';
import { Header } from '@/components/Header';
import { StudentsView } from '@/components/StudentsView';
import { getStudentsList, getClassesList } from '@/actions/academic';

export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  const [students, classes] = await Promise.all([
    getStudentsList(),
    getClassesList(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <StudentsView initialStudents={students} classes={classes} />
      </main>
    </div>
  );
}
