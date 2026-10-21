import { generateAll, type Raw } from "./texture-gen";

/* builds the surface maps off the main thread and hands the pixel buffers back without copying */
self.onmessage = (e: MessageEvent<number>) => {
  const set = generateAll(e.data);
  const bufs: ArrayBuffer[] = [];
  Object.values(set).forEach((r: Raw) => [r.map, r.normal, r.rough].forEach((a) => a && bufs.push(a.buffer as ArrayBuffer)));
  (self as unknown as Worker).postMessage(set, bufs);
};
