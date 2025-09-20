import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options?: SelectOption[];
  children: React.ReactNode;
}

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  options?: SelectOption[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  options,
  children,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <SelectContext.Provider
      value={{ value, onValueChange, options, isOpen, setIsOpen, triggerRef }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, setIsOpen, triggerRef } = React.useContext(SelectContext);

    return (
      <button
        ref={(element) => {
          if (triggerRef) {
            triggerRef.current = element!;
          }
          if (typeof ref === "function") {
            ref(element);
          } else if (ref) {
            ref.current = element;
          }
        }}
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

const SelectValue: React.FC<SelectValueProps> = ({
  placeholder,
  className,
}) => {
  const { value, options } = React.useContext(SelectContext);

  // 如果有 options，根据 value 查找对应的 label
  const displayValue =
    options && value
      ? options.find((option) => option.value === value)?.label || value
      : value;

  return (
    <span
      className={cn(
        "truncate block",
        !displayValue && "text-muted-foreground",
        className
      )}
      title={displayValue || placeholder}
    >
      {displayValue || placeholder}
    </span>
  );
};

const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className,
}) => {
  const { isOpen, setIsOpen, triggerRef } = React.useContext(SelectContext);
  const [position, setPosition] = React.useState<"bottom" | "top">("bottom");
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      // 估算下拉框高度（最多显示6个选项，每个约32px高度 + padding）
      const estimatedHeight = Math.min(
        React.Children.count(children) * 32 + 8,
        200
      );

      // 如果下方空间不足且上方空间更充裕，则向上展开
      if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
        setPosition("top");
      } else {
        setPosition("bottom");
      }
    }
  }, [isOpen, children, triggerRef]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      <div
        ref={contentRef}
        className={cn(
          "absolute left-0 z-50 w-full bg-popover border border-border rounded-md shadow-md",
          position === "top" ? "bottom-full mb-1" : "top-full mt-1",
          className
        )}
      >
        <div className="p-1 max-h-48 overflow-y-auto">{children}</div>
      </div>
    </>
  );
};

const SelectItem: React.FC<SelectItemProps> = ({
  value,
  children,
  className,
}) => {
  const { onValueChange, setIsOpen } = React.useContext(SelectContext);

  const handleClick = () => {
    if (onValueChange) {
      onValueChange(value);
    }
    setIsOpen(false);
  };

  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
