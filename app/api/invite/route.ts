import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("1. User from getUser():", user?.id ?? "NULL - no user found");

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await request.json();
  console.log("2. Code received:", code);
  console.log("3. Expected code:", process.env.INVITE_CODE);
  console.log(
    "4. Codes match:",
    code?.trim().toLowerCase() === process.env.INVITE_CODE?.toLowerCase()
  );

  // ... code check ...

  const serviceSupabase = createServiceClient();
  console.log(
    "5. Service key present:",
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error, data } = await serviceSupabase
    .from("profiles")
    .update({
      is_approved: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("id, is_approved");

  console.log("6. Upsert error:", error);
  console.log("7. Upsert data:", data);

  return NextResponse.json({ success: true });
}
