import P from "pino";

export const logger = P({
  level: "info",
  transport: {
    targets: [
      {
        target: "pino-pretty", // pretty-print for console
        options: { colorize: true },
        level: "trace",
      },
      {
        target: "pino/file", // raw file output
        options: { destination: "./logs/wa-logs.txt" },
        level: "trace",
      },
    ],
  },
});
