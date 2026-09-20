import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("poll ton payments", { minutes: 1 }, internal.miners.pollTonPayments, {});
crons.interval("process lottery draws", { minutes: 1 }, internal.lottery.processDraws, {});

export default crons;
