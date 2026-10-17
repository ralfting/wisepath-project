'use client';

import { useEffect, useState } from 'react';
import { HelpPanel } from './HelpPanel';
import { OPEN_HELP_EVENT } from './HelpPanel.helpers';

/** The panel, opened by openHelp */
export function HelpHost() {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpened(true);
    window.addEventListener(OPEN_HELP_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_HELP_EVENT, onOpen);
  }, []);

  return <HelpPanel opened={opened} onClose={() => setOpened(false)} />;
}
