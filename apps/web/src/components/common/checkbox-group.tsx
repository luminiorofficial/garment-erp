"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { SelectOption } from "./simple-select";

interface CheckboxGroupProps {
  legend: string;
  options: SelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  hint?: string;
  error?: string;
  emptyText?: string;
}

/** Multi-select as a labelled group of checkboxes (small, bounded option lists). */
export function CheckboxGroup({
  legend,
  options,
  selected,
  onChange,
  disabled,
  hint,
  error,
  emptyText = "Nothing to choose from.",
}: CheckboxGroupProps) {
  function toggle(value: string, checked: boolean) {
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));
  }

  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="text-sm font-medium">{legend}</legend>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid gap-x-4 gap-y-1.5 rounded-md border p-2.5 sm:grid-cols-2">
          {options.map((option) => (
            <Label key={option.value} className="flex items-center gap-2 font-normal">
              <Checkbox
                checked={selected.includes(option.value)}
                disabled={disabled}
                onCheckedChange={(checked) => toggle(option.value, checked === true)}
              />
              {option.label}
            </Label>
          ))}
        </div>
      )}
      {(error || hint) && (
        <p className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {error ?? hint}
        </p>
      )}
    </fieldset>
  );
}
