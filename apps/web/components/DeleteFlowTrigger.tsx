'use client';

import { useState } from 'react';
import { DeleteFlow } from './DeleteFlow';

export function DeleteFlowTrigger() {
  const [show, setShow] = useState(false);
  return (
    <>
      <button onClick={() => setShow(true)}
              className="bg-[var(--color-red)] text-white px-5 py-3 rounded-lg text-sm font-bold hover:opacity-90">
        Delete my data
      </button>
      {show && <DeleteFlow onClose={() => setShow(false)} />}
    </>
  );
}
