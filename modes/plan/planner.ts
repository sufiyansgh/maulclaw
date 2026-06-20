import {
    Output,
    extractJsonMiddleware,
    generateText,
    stepCountIs,
    tool,
    wrapLanguageModel,
} from "ai";
import { z } from "zod";
import chalk from "chalk";
import { getAgentModel } from "../../ai/ai.config.ts";
import { ActionTracker } from "../agent/action-tracker.ts";
import { ToolExecutor } from "../agent/tool-executor.ts";
import { defaultAgentConfig } from "../agent/types.ts";
import type { Plan, PlanStep } from "./types.ts";
import { createWebTools, hasWebTools } from "../shared/web-tools.ts";

const planSchema = z.object({
    researchSummary: z.string().optional(),
    steps: z
        .array(
            z.object({
                title: z.string(),
                description: z.string(),
                hints: z.array(z.string()).optional(),
                complexity: z.enum(["low", "medium", "high"]).optional(),
            }),
        )
        .min(1)
        .max(15),
});

function readOnlyTools(executor: ToolExecutor) {
    return {
        read_file: tool({
            description:
                "Read a text file from the workspace. Use a path relative to the project root.",
            inputSchema: z.object({
                path: z.string().describe("Relative file path"),
            }),
            execute: async ({ path: p }) => executor.readFile(p),
        }),

        list_files: tool({
            description: "List files and directories under a path.",
            inputSchema: z.object({
                path: z.string(),
                recursive: z.boolean().optional().default(false),
            }),
            execute: async ({ path: p, recursive }) =>
                executor.listFiles(p, recursive),
        }),

        search_files: tool({
            description:
                'Find files matching a glob pattern (e.g. "*.ts", "**/*.md"). Optional content substring filter.',
            inputSchema: z.object({
                root: z
                    .string()
                    .describe("Directory to search, relative to root"),
                pattern: z
                    .string()
                    .describe(
                        "Glob-like pattern using * and ** (forward slashes)",
                    ),
                content_contains: z.string().optional(),
            }),
            execute: async ({ root, pattern, content_contains }) =>
                executor.searchFiles(root, pattern, content_contains),
        }),

        analyze_codebase: tool({
            description:
                "Summarize structure: file counts, size, extensions. Read-only.",
            inputSchema: z.object({
                path: z.string().default("."),
            }),
            execute: async ({ path: p }) => executor.analyzeCodebase(p),
        }),

        list_skills: tool({
            description:
                "List absolute paths to SKILL.md files under configured skill directories (Cursor / Claude).",
            inputSchema: z.object({}),
            execute: async () => executor.listSkills(),
        }),

        read_skill: tool({
            description:
                "Read a SKILL.md file. Path must be absolute and under skill roots, or use a path returned by list_skills.",
            inputSchema: z.object({
                path: z.string(),
            }),
            execute: async ({ path: p }) => executor.readSkill(p),
        }),
    };
}

const PLAN_INSTRUCTIONS = (codebase: string, hasWeb: boolean) =>
    [
        "You are MaulClaw Plan Mode: a read-only planning assistant.",
        "Your job is to inspect context, understand the user's goal, and produce a practical implementation plan.",
        "",
        `Workspace root: ${codebase}`,
        "",
        "Available local research tools may include:",
        "- read_file: read specific workspace files.",
        "- list_files: inspect directory structure.",
        "- search_files: find files by path pattern or content.",
        "- analyze_codebase: summarize the workspace.",
        "- list_skills/read_skill: inspect available skill instructions.",
        "",
        hasWeb
            ? "Web search is available through web_search. Use it only for current information, external docs, APIs, libraries, or facts not present in the workspace."
            : "Web search is unavailable because FIRECRAWL_API_KEY is not configured. Do not claim to search the web.",
        "",
        "Hard rules:",
        "- Do not create, modify, delete, rename, or move files.",
        "- Do not run shell commands.",
        "- Do not stage changes.",
        "- Do not ask for approval to apply changes.",
        "- Do not claim that any code was changed.",
        "- Prefer workspace evidence over assumptions.",
        "- If information is missing, include the assumption or uncertainty in the plan.",
        "",
        "Plan quality rules:",
        "- Keep the plan ordered and executable.",
        "- Mention the likely files, folders, functions, or modules involved.",
        "- Include validation steps such as typecheck, tests, or manual CLI verification when relevant.",
        "- Include risks or edge cases when they affect implementation.",
        "- Avoid vague steps like 'update the code' without saying what should be updated.",
        "",
        "Output rules:",
        "- Output must match the provided JSON schema exactly.",
        "- Return only JSON. No markdown outside the JSON.",
        "- Keep it short: 1 to 15 steps.",
    ].join("\n");

export async function generatePlan(goal: string) {
    const config = defaultAgentConfig();
    const tracker = new ActionTracker();
    const executor = new ToolExecutor(tracker, config);

    const hasWeb = hasWebTools();
    const model = wrapLanguageModel({
        model: getAgentModel(),
        middleware: extractJsonMiddleware(),
    });

    const tools = {
        ...readOnlyTools(executor),
        ...(hasWeb ? createWebTools(tracker) : {}),
    };
    console.log(chalk.cyan("\n🔍 Researching & drafting a plan…\n"));

    const result = await generateText({
        model,
        tools,
        stopWhen: stepCountIs(20),
        system: PLAN_INSTRUCTIONS(config.codebasePath, hasWeb),
        prompt: `User goal: \n${goal}`,
        output: Output.object({ schema: planSchema }),
    });
    const validated = planSchema.parse(result.output);

    const steps: PlanStep[] = validated.steps.map((s, i) => ({
        id: `step-${i + 1}`,
        title: s.title,
        description: s.description,
        hints: s.hints,
        complexity: s.complexity,
    }));
    return { goal, researchSummary: validated.researchSummary, steps };
}
