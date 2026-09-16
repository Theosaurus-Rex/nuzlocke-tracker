import { runAdapterContractTests } from "./adapter.contract";
import { createMemoryAdapter } from "./memory-adapter";

runAdapterContractTests("MemoryAdapter", async () => {
  const adapter = createMemoryAdapter();
  await adapter.init();
  return adapter;
});
