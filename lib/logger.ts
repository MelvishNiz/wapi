import P from "pino";

const streams = [
  { level: "trace", stream: process.stdout },
  { level: "trace", stream: P.destination("./logs/wa-logs.txt") },
];

export const logger = P({ level: "info" }, P.multistream(streams));
