import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("poll ton payments", { minutes: 1 }, internal.miners.pollTonPayments, {});

export default crons;
