// import type React from "react"
// import "./globals.css"
// import { Inter } from "next/font/google"
// import { SidebarProvider } from "@/components/ui/sidebar"
// import { AppSidebar } from "@/components/app-sidebar"
// import { Header } from "@/components/header"

// const inter = Inter({ subsets: ["latin"] })

// export const metadata = {
//   title: "RehabSync",
//   description: "A simple clinician dashboard for rehab exercises",
// }

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   return (
//     <html lang="en">
//       <body className={inter.className}>
//         <SidebarProvider>
//           <div className="flex min-h-screen w-full">
//             <AppSidebar />
//             <div className="flex-1 flex flex-col w-full">
//               <Header />
//               <main className="flex-1 p-6 bg-gray-100">
//                 {children}
//               </main>
//             </div>
//           </div>
//         </SidebarProvider>
//       </body>
//     </html>
//   )
// }

import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { AIChatWidget } from "@/components/ai-chat-widget"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "RehabSync",
  description: "A simple clinician dashboard for rehab exercises",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col w-full">
              <Header />
              <main className="flex-1 p-6 bg-gray-100">
                {children}
              </main>
            </div>
          </div>
          <AIChatWidget />
        </SidebarProvider>
      </body>
    </html>
  )
}