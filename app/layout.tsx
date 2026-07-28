import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans=Geist({variable:"--font-sans",subsets:["latin"]});
const mono=Geist_Mono({variable:"--font-mono",subsets:["latin"]});

export const metadata: Metadata = {
  title:"Procurement Mission Control",
  description:"A transparent multi-agent decision environment for procurement exceptions.",
  icons:{icon:"/favicon.svg"},
  openGraph:{title:"Procurement Mission Control",description:"One exception. Six points of view. A transparent research prototype for human-accountable procurement decisions.",type:"website",images:["/og.png"]},
  twitter:{card:"summary_large_image",title:"Procurement Mission Control",description:"A transparent multi-agent decision environment for procurement exceptions.",images:["/og.png"]},
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>
}
