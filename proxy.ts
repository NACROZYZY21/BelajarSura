import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsAuth =
    path.startsWith("/admin") || path.startsWith("/belajar") || path.startsWith("/superadmin");

  if (!user && needsAuth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && (needsAuth || path === "/login" || path === "/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, aktif, status_akun")
      .eq("id", user.id)
      .single();
    const role = profile?.role as "superadmin" | "guru" | "siswa" | undefined;

    // guru nonaktif (langganan berakhir) ditolak
    if (role === "guru" && profile?.status_akun !== "aktif") {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?nonaktif=1", request.url));
    }
    // siswa: tenant_id() null berarti diarsipkan ATAU gurunya nonaktif
    if (role === "siswa") {
      const { data: tid } = await supabase.rpc("tenant_id");
      if (!tid) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login?arsip=1", request.url));
      }
    }

    const home =
      role === "superadmin" ? "/superadmin" : role === "guru" ? "/admin" : "/belajar";
    if (path === "/login" || path === "/") {
      return NextResponse.redirect(new URL(home, request.url));
    }
    if (path.startsWith("/superadmin") && role !== "superadmin")
      return NextResponse.redirect(new URL(home, request.url));
    if (path.startsWith("/admin") && role !== "guru")
      return NextResponse.redirect(new URL(home, request.url));
    if (path.startsWith("/belajar") && role !== "siswa")
      return NextResponse.redirect(new URL(home, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/belajar/:path*", "/superadmin/:path*"],
};
