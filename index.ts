#!/usr/bin/env bun

import { Command } from "commander";
import { runWakeUp } from "./tui/wakeup";

const program = new Command();

program
    .name("maulclaw")
    .description("OpenClaw walked so MaulClaw could run people over.")
    .version("1.0.0");

program
    .command("wakeup")
    .description("show the banner and pick cli or telegram mode")
    .action(async () => {
        await runWakeUp();
    });

await program.parseAsync(process.argv);
