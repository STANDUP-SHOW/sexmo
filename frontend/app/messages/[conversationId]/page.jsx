'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/AuthContext';
import ConversationThread from '../../../components/ConversationThread';

export default function ConversationPage() {
  const { conversationId } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto h-[70vh]">
      <ConversationThread conversationId={conversationId} />
    </div>
  );
}
