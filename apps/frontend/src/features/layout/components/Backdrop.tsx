import { useSidebar } from "@/shared/context/SidebarContext";
import React from "react";

const Backdrop: React.FC = () => {
  const { state, isMobile, toggleHidden } = useSidebar();

  if (!isMobile || state !== "open") return null;

  return (
    <div
      className="fixed left-0 right-0 bottom-0 top-[128px] z-40 bg-gray-900/50 lg:hidden lg:top-[72px]"
      onClick={toggleHidden}
    />
  );
};

export default Backdrop;
