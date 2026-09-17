import { NextResponse } from "next/server";
import { runWorkflow, type WorkflowInput } from "@/lib/workflow";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as WorkflowInput;
    return NextResponse.json(runWorkflow(input));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
