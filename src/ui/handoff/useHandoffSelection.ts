import { useEffect, useState } from 'react';

import { registerHandoffMessageListener } from '@/ui/handoff/handoffMessageListener';

export interface HandoffSelectionState {
  count: number;
  names: string[];
}

const INITIAL_SELECTION: HandoffSelectionState = { count: 0, names: [] };

export function useHandoffSelection(): HandoffSelectionState {
  const [state, setState] = useState<HandoffSelectionState>(INITIAL_SELECTION);

  useEffect(function () {
    return registerHandoffMessageListener({
      onSelection: function (message) {
        setState({ count: message.count, names: message.names });
      },
    });
  }, []);

  return state;
}
