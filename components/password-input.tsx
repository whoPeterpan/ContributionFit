"use client";

/**
 * components/password-input.tsx — Accessible password input with visibility toggle button.
 *
 * Implements a secure password field with an accessible toggle button.
 * The button utilizes `aria-pressed` and an active `aria-label` ("Show password" / "Hide password")
 * to switch the input type between "password" and "text" without logging or storing plaintext values.
 */

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  disabled?: boolean;
}

export function PasswordInput({
  id,
  name,
  autoComplete,
  value,
  onChange,
  required = true,
  minLength,
  placeholder = "••••••••••",
  disabled = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative flex items-center">
      <input
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-11 px-3 pr-12 text-base font-medium border-[3px] border-border bg-card text-foreground shadow-brut placeholder:text-muted-foreground focus-visible:outline-4 focus-visible:outline-offset-2 outline-foreground disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        disabled={disabled}
        aria-pressed={showPassword}
        aria-label={showPassword ? "Hide password" : "Show password"}
        className="absolute right-2 p-1.5 text-foreground hover:bg-muted border-2 border-transparent hover:border-border transition-colors focus-visible:outline-2 outline-foreground"
      >
        {showPassword ? (
          <EyeOff className="size-5" aria-hidden="true" />
        ) : (
          <Eye className="size-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
