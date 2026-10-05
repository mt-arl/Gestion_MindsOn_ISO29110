import React from 'react';
import { Header } from '@/components/Header';
import { ScheduleView } from '@/components/ScheduleView';
import { getWeeklyScheduleAction } from '@/actions/schedule';
import { getTeachersList, getStudentsList } from '@/actions/academic';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  const [scheduleData, teachers, students] = await Promise.all([
    getWeeklyScheduleAction(),
    getTeachersList(),
    getStudentsList(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <ScheduleView
          scheduleData={scheduleData}
          teachers={teachers}
          students={students}
        />
      </main>
    </div>
  );
}
