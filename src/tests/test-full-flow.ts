import { testDbconnection } from '../config/db';
import { ReversalService } from '../services/reversal.service';

const runTest = async () => {
  // 1. Connect DB
  await testDbconnection();

  console.log("\n--- 🎬 TEST RUN 1: First Time (Should Succeed) ---");
  await ReversalService.processTransactions();

  console.log("\n--- 🎬 TEST RUN 2: Second Time (Should Block) ---");
  await ReversalService.processTransactions();
  
  // Force exit because the DB pool keeps the script alive
  process.exit(0);
};

runTest();