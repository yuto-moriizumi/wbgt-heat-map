import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  // A list of all locales that are supported
  locales: ["ja", "en"],

  // デフォルトロケールを日本語に設定
  defaultLocale: "ja",

  // デフォルトロケールの場合にプレフィックスを付けない
  localePrefix: "as-needed",
  localeCookie: false,
});

export const config = {
  // Skip all paths that should not be internationalized. This example skips
  // certain folders and all pathnames with a dot (e.g. favicon.ico)
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
