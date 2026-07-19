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
  const needsAuth = path.startsWith("/admin") || path.startsWith("/belajar");

  if (!user && needsAuth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && (needsAuth || path === "/login" || path === "/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, aktif")
      .eq("id", user.id)
      .single();
    const isAdmin = profile?.role === "admin";

    // siswa nonaktif (tahun ajarannya diarsipkan) tidak boleh masuk
    if (!isAdmin && profile && profile.aktif === false) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?arsip=1", request.url));
    }

    if (path === "/login" || path === "/") {
      return NextResponse.redirect(new URL(isAdmin ? "/admin" : "/belajar", request.url));
    }
    if (path.startsWith("/admin") && !isAdmin) {
      return NextResponse.redirect(new URL("/belajar", request.url));
    }
    if (path.startsWith("/belajar") && isAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/belajar/:path*"],
};
