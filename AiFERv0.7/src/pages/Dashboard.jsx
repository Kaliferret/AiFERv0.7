import React from 'react';
import PopShell from '@/components/ui/PopShell';
import { PopCard, PopButton, PopBadge, SectionHeader } from '@/components/ui/popos-primitives';

export default function Dashboard() {
  return (
    <PopShell title='Dashboard' subtitle='AiFER v0.7 placeholder screen'>
      <div style={ padding: 24, display: 'grid', gap: 16 }>
        <SectionHeader title='Dashboard' subtitle='This module was scaffolded to make the uploaded codebase releaseable.' right={<PopBadge>v0.7</PopBadge>} />
        <PopCard>
          <p style={ marginTop: 0, color: '#AAAAAB' }>This page is wired into routing and ready for a fuller implementation.</p>
          <div style={ display: 'flex', gap: 12, flexWrap: 'wrap' }>
            <PopButton variant='primary'>Open roadmap</PopButton>
            <PopButton>View source</PopButton>
          </div>
        </PopCard>
      </div>
    </PopShell>
  );
}
