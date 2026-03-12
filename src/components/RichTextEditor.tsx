import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { FontSize } from "@/lib/tiptap-font-size";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Undo, Redo, Variable, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Superscript as SuperscriptIcon, Subscript as SubscriptIcon, Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TEMPLATE_VARIABLES, getVariablesByCategory } from "@/lib/template-variables";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const FONTS = [
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Courier New", label: "Courier New" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
  { value: "Garamond", label: "Garamond" },
  { value: "Calibri", label: "Calibri" },
];

const FONT_SIZES = [
  "8", "9", "10", "10.5", "11", "12", "14", "16", "18", "20", "24", "28", "36", "48", "72",
];

const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999",
  "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef",
  "#980000", "#ff0000", "#ff9900", "#ffff00",
  "#00ff00", "#00ffff", "#4a86e8", "#0000ff",
  "#9900ff", "#ff00ff", "#e6b8af", "#f4cccc",
];

const HIGHLIGHT_COLORS = [
  "#ffff00", "#00ff00", "#00ffff", "#ff69b4",
  "#ffa500", "#ff6347", "#dda0dd", "#87ceeb",
];

const RichTextEditor = ({ content, onChange, placeholder = "Comece a escrever o modelo do contrato...", className }: RichTextEditorProps) => {
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      FontFamily,
      Color,
      FontSize,
      Superscript,
      Subscript,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[800px] px-[96px] py-[76px]",
        style: "font-family: 'Times New Roman', serif; font-size: 12pt; text-align: justify; line-height: 1.6;",
      },
    },
  });

  if (!editor) return null;

  const insertVariable = (key: string) => {
    editor.chain().focus().insertContent(`<span data-type="variable" class="bg-primary/15 text-primary rounded px-1.5 py-0.5 text-sm font-mono">{{${key}}}</span>&nbsp;`).run();
    setVariablesOpen(false);
  };

  const grouped = getVariablesByCategory();

  const currentFont = editor.getAttributes("textStyle").fontFamily || "Times New Roman";
  const currentSize = editor.getAttributes("textStyle").fontSize?.replace("pt", "") || "12";

  const ToolbarButton = ({ onClick, active, tooltip, children, className: btnClass }: {
    onClick: () => void; active?: boolean; tooltip: string; children: React.ReactNode; className?: string;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 rounded-sm", active && "bg-accent text-accent-foreground", btnClass)}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );

  const Separator = () => <div className="mx-0.5 h-6 w-px bg-border" />;

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex flex-col rounded-lg border border-input bg-muted/30", className)}>
        {/* Toolbar */}
        <div className="sticky top-0 z-10 rounded-t-lg border-b border-border bg-background px-2 py-1.5">
          {/* Row 1: Font, Size, Formatting */}
          <div className="flex flex-wrap items-center gap-1">
            {/* Font Family */}
            <Select
              value={currentFont}
              onValueChange={(val) => editor.chain().focus().setFontFamily(val).run()}
            >
              <SelectTrigger className="h-7 w-[140px] text-xs border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs" style={{ fontFamily: f.value }}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Font Size */}
            <Select
              value={currentSize}
              onValueChange={(val) => editor.chain().focus().setFontSize(`${val}pt`).run()}
            >
              <SelectTrigger className="h-7 w-[65px] text-xs border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator />

            {/* Text formatting */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} tooltip="Negrito (Ctrl+B)">
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} tooltip="Itálico (Ctrl+I)">
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} tooltip="Sublinhado (Ctrl+U)">
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} tooltip="Tachado">
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} tooltip="Sobrescrito">
              <SuperscriptIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} tooltip="Subscrito">
              <SubscriptIcon className="h-3.5 w-3.5" />
            </ToolbarButton>

            <Separator />

            {/* Text color */}
            <Popover open={colorOpen} onOpenChange={setColorOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-sm">
                  <div className="flex flex-col items-center gap-0">
                    <Palette className="h-3 w-3" />
                    <div className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: editor.getAttributes("textStyle").color || "#000000" }} />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Cor do texto</p>
                <div className="grid grid-cols-10 gap-1">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="h-5 w-5 rounded border border-border transition-transform hover:scale-125"
                      style={{ backgroundColor: c }}
                      onClick={() => { editor.chain().focus().setColor(c).run(); setColorOpen(false); }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { editor.chain().focus().unsetColor().run(); setColorOpen(false); }}
                >
                  Remover cor
                </button>
              </PopoverContent>
            </Popover>

            {/* Highlight */}
            <Popover open={highlightOpen} onOpenChange={setHighlightOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm", editor.isActive("highlight") && "bg-accent")}>
                  <Highlighter className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Cor de destaque</p>
                <div className="grid grid-cols-8 gap-1">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="h-5 w-5 rounded border border-border transition-transform hover:scale-125"
                      style={{ backgroundColor: c }}
                      onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); setHighlightOpen(false); }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { editor.chain().focus().unsetHighlight().run(); setHighlightOpen(false); }}
                >
                  Remover destaque
                </button>
              </PopoverContent>
            </Popover>

            <Separator />

            {/* Alignment */}
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} tooltip="Alinhar à esquerda">
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} tooltip="Centralizar">
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} tooltip="Alinhar à direita">
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} tooltip="Justificar">
              <AlignJustify className="h-3.5 w-3.5" />
            </ToolbarButton>

            <Separator />

            {/* Lists */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} tooltip="Lista com marcadores">
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} tooltip="Lista numerada">
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>

            <Separator />

            {/* Headings */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} tooltip="Título 1">
              <Heading1 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} tooltip="Título 2">
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} tooltip="Título 3">
              <Heading3 className="h-3.5 w-3.5" />
            </ToolbarButton>

            <Separator />

            {/* Undo / Redo */}
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} tooltip="Desfazer (Ctrl+Z)">
              <Undo className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} tooltip="Refazer (Ctrl+Y)">
              <Redo className="h-3.5 w-3.5" />
            </ToolbarButton>

            <Separator />

            {/* Variable Insertion */}
            <Popover open={variablesOpen} onOpenChange={setVariablesOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                  <Variable className="h-3.5 w-3.5" />
                  Variável
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="max-h-80 overflow-y-auto p-2">
                  {Object.entries(grouped).map(([category, vars]) => (
                    <div key={category} className="mb-2">
                      <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</p>
                      {vars.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => insertVariable(v.key)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                        >
                          <code className="rounded bg-muted px-1 py-0.5 text-xs text-primary">{`{{${v.key}}}`}</code>
                          <span className="text-xs text-muted-foreground">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Document area - A4 style */}
        <div className="flex-1 overflow-y-auto bg-muted/50 p-6">
          <div className="mx-auto w-[794px] min-h-[1123px] bg-background shadow-lg rounded-sm border border-border/50">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default RichTextEditor;
