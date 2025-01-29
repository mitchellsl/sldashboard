"use client";

interface FormFieldProps {
  label: string;
  type?: "text" | "password";
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FormField({ label, type = "text", value, onChange }: FormFieldProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <label className="text-right col-span-1 self-center">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="col-span-3 border rounded p-2"
      />
    </div>
  );
} 