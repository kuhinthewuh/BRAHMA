import { EventEmitter } from 'events';
// Need to import from shared package, make sure we run npm install shared in orchestrator!
// Let's do that manually:
// 'npm install shared -w services/orchestrator' failed because we need to use the workspace link.
// We will just import it directly or use 'shared'.
import { BrahmaEvent } from 'shared';

class BrahmaEventBus extends EventEmitter {
  emitEvent(event: BrahmaEvent) {
    this.emit('brahma_event', event);
    this.emit(event.type, event);
  }

  onEvent(handler: (event: BrahmaEvent) => void) {
    this.on('brahma_event', handler);
  }
}

export const eventBus = new BrahmaEventBus();
