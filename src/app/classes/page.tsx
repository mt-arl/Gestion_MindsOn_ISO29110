import React from 'react';
import { Header } from '@/components/Header';
import { ClassesView } from '@/components/ClassesView';
import { getClassesList, getTeachersList } from '@/actions/academic';

export const dynamic = 'force-dynamic';

export default async function ClassesPage() {
  const [classes, teachers] = await Promise.all([
    getClassesList(),
    getTeachersList(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <ClassesView initialClasses={classes} teachers={teachers} />
      </main>
    </div>
  );
}
