import type { Channel, ClientChannel, ClientMessage, ServerMessage } from './protocol';

export function loopbackChannel(): { server: Channel; client: ClientChannel } {
  let open = true;
  let serverCb: ((m: ClientMessage) => void) | null = null;
  let clientCb: ((m: ServerMessage) => void) | null = null;
  const close = () => {
    open = false;
    serverCb = null;
    clientCb = null;
  };
  const server: Channel = {
    send: (msg) => { if (open) clientCb?.(msg); },
    onMessage: (cb) => { serverCb = cb; },
    close,
  };
  const client: ClientChannel = {
    send: (msg) => { if (open) serverCb?.(msg); },
    onMessage: (cb) => { clientCb = cb; },
    close,
  };
  return { server, client };
}
