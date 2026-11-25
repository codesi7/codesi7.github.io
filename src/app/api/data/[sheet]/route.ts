import { NextResponse, type NextRequest } from "next/server";
import {
  bulkDeleteRecords,
  createRecord,
  deleteRecord,
  readDatasetRecords,
  updateRecord,
} from "@/lib/data-store";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sheet: string }> }
) {
  try {
    const { sheet } = await context.params;
    const source = request.nextUrl.searchParams.get("source") === "github" ? "github" : "local";
    const data = await readDatasetRecords(sheet, source);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read dataset." },
      { status: 404 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sheet: string }> }
) {
  try {
    const { sheet } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const result = await createRecord(sheet, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create record." },
      { status: 400 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ sheet: string }> }
) {
  try {
    const { sheet } = await context.params;
    const body = (await request.json()) as { _id?: string; data?: Record<string, unknown> } & Record<string, unknown>;
    const id = String(body._id || "");
    if (!id) {
      return NextResponse.json({ error: "Record _id is required." }, { status: 400 });
    }
    const payload = body.data ?? body;
    const result = await updateRecord(sheet, id, payload);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update record." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sheet: string }> }
) {
  try {
    const { sheet } = await context.params;
    const idParam = request.nextUrl.searchParams.get("id");
    if (idParam) {
      const result = await deleteRecord(sheet, idParam);
      return NextResponse.json(result);
    }

    const body = (await request.json().catch(() => ({}))) as { ids?: string[]; id?: string };
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      const result = await bulkDeleteRecords(sheet, body.ids);
      return NextResponse.json(result);
    }
    if (body.id) {
      const result = await deleteRecord(sheet, body.id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Record id or ids[] required." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete record." },
      { status: 400 }
    );
  }
}
