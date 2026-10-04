import { cn } from "@/lib/utils"

export function SectionHeading({
  serifWord,
  monoWord,
  className,
  align = "left",
}: {
  serifWord: string
  monoWord: string
  className?: string
  align?: "left" | "center"
}) {
  return (
    <div className={cn("flex items-baseline gap-2", align === "center" && "justify-center", className)}>
      <span className="font-serif italic text-2xl md:text-4xl text-foreground/70 lowercase">
        {serifWord}
      </span>
      <h2 className="text-2xl font-extrabold uppercase tracking-tight text-foreground md:text-4xl">
        {monoWord}
      </h2>
    </div>
  )
}
