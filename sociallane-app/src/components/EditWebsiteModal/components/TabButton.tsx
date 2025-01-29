"use client";

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      className={`px-4 py-2 ${
        active 
          ? "border-b-2 border-blue-500 text-blue-500" 
          : "text-gray-500"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
} 