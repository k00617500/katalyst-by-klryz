import Image from "next/image";
import { Fragment } from "react";

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

/**
 * Renders Tiptap's JSON document as React elements — never as raw HTML.
 * Unknown node/mark types are skipped rather than guessed at, so content
 * from a future editor version degrades safely instead of crashing.
 */
export function TiptapRenderer({ content }: { content: Record<string, unknown> }) {
  const doc = content as TiptapNode;
  if (!doc?.content) return null;
  return <>{doc.content.map((node, i) => <BlockNode key={i} node={node} />)}</>;
}

function renderMarks(text: string, marks: TiptapNode["marks"] | undefined, key: number): React.ReactNode {
  if (!marks?.length) return text;
  return marks.reduce<React.ReactNode>((acc, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong key={key}>{acc}</strong>;
      case "italic":
        return <em key={key}>{acc}</em>;
      case "underline":
        return <u key={key}>{acc}</u>;
      case "strike":
        return <s key={key}>{acc}</s>;
      case "code":
        return (
          <code key={key} className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            {acc}
          </code>
        );
      case "highlight":
        return (
          <mark key={key} className="rounded bg-brand/20 px-0.5 text-foreground">
            {acc}
          </mark>
        );
      case "textStyle": {
        const color = mark.attrs?.color;
        return typeof color === "string" ? (
          <span key={key} style={{ color }}>
            {acc}
          </span>
        ) : (
          acc
        );
      }
      case "link":
        return (
          <a
            key={key}
            href={typeof mark.attrs?.href === "string" ? mark.attrs.href : undefined}
            target="_blank"
            rel="noreferrer noopener"
            className="text-brand-ink underline underline-offset-4"
          >
            {acc}
          </a>
        );
      default:
        return acc;
    }
  }, text);
}

function InlineContent({ nodes }: { nodes?: TiptapNode[] }) {
  if (!nodes) return null;
  return (
    <>
      {nodes.map((node, i) => {
        if (node.type === "text") return <Fragment key={i}>{renderMarks(node.text ?? "", node.marks, i)}</Fragment>;
        if (node.type === "hardBreak") return <br key={i} />;
        return null;
      })}
    </>
  );
}

const ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

function BlockNode({ node }: { node: TiptapNode }) {
  const textAlign = node.attrs?.textAlign;
  const align = typeof textAlign === "string" ? ALIGN_CLASS[textAlign] ?? "" : "";

  switch (node.type) {
    case "paragraph":
      return (
        <p className={`mb-5 leading-relaxed text-muted-foreground ${align}`}>
          <InlineContent nodes={node.content} />
        </p>
      );
    case "heading": {
      const levelAttr = node.attrs?.level;
      const level = typeof levelAttr === "number" ? levelAttr : 2;
      const className =
        level === 1
          ? "mt-10 mb-4 text-3xl font-medium tracking-tight"
          : level === 2
            ? "mt-10 mb-4 text-2xl font-medium tracking-tight"
            : "mt-8 mb-3 text-xl font-medium tracking-tight";
      const Tag = `h${Math.min(level, 6)}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return (
        <Tag className={`${className} ${align}`}>
          <InlineContent nodes={node.content} />
        </Tag>
      );
    }
    case "bulletList":
      return (
        <ul className="mb-5 list-disc space-y-2 pl-6 text-muted-foreground">
          {node.content?.map((item, i) => (
            <ListItem key={i} node={item} />
          ))}
        </ul>
      );
    case "orderedList":
      return (
        <ol className="mb-5 list-decimal space-y-2 pl-6 text-muted-foreground">
          {node.content?.map((item, i) => (
            <ListItem key={i} node={item} />
          ))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote className="mb-5 border-l-2 border-brand pl-4 italic text-muted-foreground">
          {node.content?.map((child, i) => <BlockNode key={i} node={child} />)}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre className="mb-5 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
          <code>{node.content?.map((c) => c.text).join("")}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr className="my-8 border-border" />;
    case "image": {
      const src = node.attrs?.src;
      const alt = node.attrs?.alt;
      if (typeof src !== "string") return null;
      return (
        <span className="mb-5 block">
          <span className="relative block aspect-video overflow-hidden rounded-lg">
            <Image
              src={src}
              alt={typeof alt === "string" ? alt : ""}
              fill
              className="object-cover"
              unoptimized
            />
          </span>
          {typeof alt === "string" && alt && (
            <span className="mt-2 block text-center text-xs text-muted-foreground">{alt}</span>
          )}
        </span>
      );
    }
    case "table":
      return (
        <div className="mb-5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {node.content?.map((row, i) => (
                <tr key={i} className="border-b border-border">
                  {row.content?.map((cell, j) => {
                    const CellTag = cell.type === "tableHeader" ? "th" : "td";
                    return (
                      <CellTag key={j} className="p-2 text-left align-top">
                        {cell.content?.map((c, k) => <BlockNode key={k} node={c} />)}
                      </CellTag>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

function ListItem({ node }: { node: TiptapNode }) {
  return <li>{node.content?.map((child, i) => <BlockNode key={i} node={child} />)}</li>;
}
