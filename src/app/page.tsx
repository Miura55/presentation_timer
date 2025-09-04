import { Suspense } from 'react';
import PresentationTimer from '@/components/PresentationTimer';

function TimerWithSuspense() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <PresentationTimer />
    </Suspense>
  );
}

export default function Home() {
  return <TimerWithSuspense />;
}
