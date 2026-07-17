import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { pages } from './pages';

function LoadingScreen() {
  return <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', color:'#d9dbe1', background:'#06060C' }}>Loading AiFER v0.7…</div>;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path='/' element={<Navigate to='/AppLauncher' replace />} />
        {Object.entries(pages).map(([path, Component]) => <Route key={path} path={`/${path}`} element={<Component />} />)}
        <Route path='*' element={<Navigate to='/AppLauncher' replace />} />
      </Routes>
    </Suspense>
  );
}
