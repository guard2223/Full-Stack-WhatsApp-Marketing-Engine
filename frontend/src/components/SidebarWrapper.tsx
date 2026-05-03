"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isAuth = pathname === "/login" || pathname === "/signup";
  const noSidebar = isLanding || isAuth;

  return (
    <>
      {!noSidebar && <Sidebar />}
      <main className={`flex-1 overflow-y-auto relative ${noSidebar ? 'p-0' : 'p-6 md:p-10'}`}>
        {!noSidebar && (
            <>
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            </>
        )}
        
        <div className={`${noSidebar ? 'max-w-none' : 'max-w-7xl mx-auto'} relative z-10`}>
          {children}
        </div>
      </main>
    </>
  );
}
