import { Outfit } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

import { ThemeProvider } from '@/shared/context/ThemeContext';
import { cookies } from 'next/headers';

const outfit = Outfit({
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  type ServerTheme = "light" | "dark" | "dracula";
  const rawTheme = (await cookies()).get('st-theme')?.value;
  const cookieTheme: ServerTheme | undefined =
    rawTheme === "light" || rawTheme === "dark" || rawTheme === "dracula"
      ? rawTheme
      : undefined;

  const isDarkPalette = cookieTheme === "dark" || cookieTheme === "dracula";

  return (
    <html
      lang="en"
      data-theme={cookieTheme}
      className={isDarkPalette ? "dark" : undefined}
      suppressHydrationWarning
    >
      <head>
        <Script id="st-theme-init" strategy="beforeInteractive">{`(function(){try{var root=document.documentElement;var allowed={light:1,dark:1,dracula:1};var theme=null;try{theme=localStorage.getItem("theme");}catch(e){}if(theme&&allowed[theme]){root.dataset.theme=theme;var dark=(theme==="dark"||theme==="dracula");root.classList.toggle("dark",dark);root.style.colorScheme=dark?"dark":"light";document.cookie="st-theme="+encodeURIComponent(theme)+"; path=/; max-age=31536000; samesite=lax";}else if(root.dataset&&root.dataset.theme&&allowed[root.dataset.theme]){document.cookie="st-theme="+encodeURIComponent(root.dataset.theme)+"; path=/; max-age=31536000; samesite=lax";}var scale=null;try{scale=localStorage.getItem("text-scale");}catch(e){}if(scale!==null&&scale!==undefined){var n=Number(scale);if(Number.isFinite(n)){n=Math.max(-2,Math.min(2,Math.round(n)));if(n===0){root.style.removeProperty("font-size");}else{root.style.fontSize=(16+n)+"px";}}}}catch(e){}})();`}</Script>
      </head>
      <body className={outfit.className}>
        <ThemeProvider initialTheme={cookieTheme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
