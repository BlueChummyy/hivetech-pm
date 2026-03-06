import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Mention from '@tiptap/extension-mention';
import { common, createLowlight } from 'lowlight';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Link as LinkIcon,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import '@/styles/tiptap.css';

const lowlight = createLowlight(common);

interface MemberSuggestion {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  mode?: 'full' | 'compact';
  editable?: boolean;
  members?: MemberSuggestion[];
  onSubmit?: () => void;
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={cn(
        'rounded p-1.5 transition-colors',
        active
          ? 'bg-primary-600/20 text-primary-400'
          : 'text-surface-400 hover:bg-surface-700 hover:text-surface-200',
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-surface-700" />;
}

function Toolbar({ editor, mode }: { editor: Editor; mode: 'full' | 'compact' }) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);

  const iconSize = 'h-4 w-4';

  const toggleHeading = useCallback((level: 1 | 2 | 3) => {
    const { from, to } = editor.state.selection;
    const $from = editor.state.doc.resolve(from);
    const $to = editor.state.doc.resolve(to);
    const parentFrom = $from.parent;
    const parentTo = $to.parent;

    // If selection spans part of a single paragraph, split it first
    if (
      !editor.isActive('heading', { level }) &&
      parentFrom === parentTo &&
      parentFrom.type.name === 'paragraph' &&
      (from > $from.start() || to < $from.end())
    ) {
      const chain = editor.chain().focus();
      // Split at end of selection first (if not at block end)
      if (to < $from.end()) {
        chain.command(({ tr }) => {
          tr.split(to);
          return true;
        });
      }
      // Split at start of selection (if not at block start)
      if (from > $from.start()) {
        chain.command(({ tr }) => {
          tr.split(from);
          return true;
        });
      }
      chain.toggleHeading({ level }).run();
    } else {
      editor.chain().focus().toggleHeading({ level }).run();
    }
  }, [editor]);

  const handleLink = useCallback(() => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    setShowLinkInput(true);
    setTimeout(() => linkInputRef.current?.focus(), 0);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (linkUrl.trim()) {
      const url = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  if (mode === 'compact') {
    return (
      <div className="flex items-center gap-0.5 border-b border-surface-700 bg-surface-800 px-2 py-1 rounded-t-lg">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className={iconSize} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          <ListOrdered className={iconSize} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          <Code className={iconSize} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={handleLink}
          title="Link"
        >
          <LinkIcon className={iconSize} />
        </ToolbarButton>

        {showLinkInput && (
          <div className="flex items-center gap-1 ml-1">
            <input
              ref={linkInputRef}
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); }
              }}
              placeholder="URL..."
              className="w-36 rounded border border-surface-600 bg-surface-900 px-2 py-0.5 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
              className="rounded bg-primary-600 px-2 py-0.5 text-xs text-white hover:bg-primary-700"
            >
              OK
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-surface-700 bg-surface-800 px-2 py-1 rounded-t-lg">
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <UnderlineIcon className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => toggleHeading(1)}
        title="Heading 1 (applies to current line)"
      >
        <Heading1 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => toggleHeading(2)}
        title="Heading 2 (applies to current line)"
      >
        <Heading2 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => toggleHeading(3)}
        title="Heading 3 (applies to current line)"
      >
        <Heading3 className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <List className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Ordered list"
      >
        <ListOrdered className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task list"
      >
        <ListTodo className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquote"
      >
        <Quote className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code block"
      >
        <Code className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        active={editor.isActive('link')}
        onClick={handleLink}
        title="Link"
      >
        <LinkIcon className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Highlight"
      >
        <Highlighter className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        title="Align left"
      >
        <AlignLeft className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        title="Align center"
      >
        <AlignCenter className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        title="Align right"
      >
        <AlignRight className={iconSize} />
      </ToolbarButton>

      {showLinkInput && (
        <div className="flex items-center gap-1 ml-1">
          <input
            ref={linkInputRef}
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
              if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); }
            }}
            placeholder="Enter URL..."
            className="w-48 rounded border border-surface-600 bg-surface-900 px-2 py-0.5 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
            className="rounded bg-primary-600 px-2 py-0.5 text-xs text-white hover:bg-primary-700"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}

// Mention suggestion renderer
function createMentionSuggestion(members: MemberSuggestion[]) {
  return {
    items: ({ query }: { query: string }) => {
      return members
        .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8);
    },
    render: () => {
      let component: HTMLDivElement | null = null;
      let selectedIndex = 0;
      let items: MemberSuggestion[] = [];
      let command: ((props: { id: string; label: string }) => void) | null = null;

      function updateList() {
        if (!component) return;
        component.innerHTML = items
          .map(
            (item, index) =>
              `<button class="mention-suggestion-item ${index === selectedIndex ? 'is-selected' : ''}" data-index="${index}">
                <span class="mention-suggestion-name">@${item.name}</span>
              </button>`,
          )
          .join('');
        // Bind click handlers
        component.querySelectorAll('.mention-suggestion-item').forEach((btn) => {
          btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const idx = parseInt((btn as HTMLElement).dataset.index || '0');
            const item = items[idx];
            if (item && command) {
              command({ id: item.id, label: item.name });
            }
          });
        });
      }

      return {
        onStart: (props: any) => {
          component = document.createElement('div');
          component.className = 'mention-suggestion-dropdown';
          items = props.items;
          command = props.command;
          selectedIndex = 0;
          updateList();

          if (props.clientRect) {
            const rect = props.clientRect();
            if (rect) {
              component.style.position = 'fixed';
              component.style.left = `${rect.left}px`;
              component.style.top = `${rect.bottom + 4}px`;
              component.style.zIndex = '9999';
            }
          }
          document.body.appendChild(component);
        },
        onUpdate: (props: any) => {
          items = props.items;
          command = props.command;
          selectedIndex = 0;
          updateList();

          if (props.clientRect && component) {
            const rect = props.clientRect();
            if (rect) {
              component.style.left = `${rect.left}px`;
              component.style.top = `${rect.bottom + 4}px`;
            }
          }
        },
        onKeyDown: (props: any) => {
          if (props.event.key === 'ArrowUp') {
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            updateList();
            return true;
          }
          if (props.event.key === 'ArrowDown') {
            selectedIndex = (selectedIndex + 1) % items.length;
            updateList();
            return true;
          }
          if (props.event.key === 'Enter') {
            const item = items[selectedIndex];
            if (item && command) {
              command({ id: item.id, label: item.name });
            }
            return true;
          }
          return false;
        },
        onExit: () => {
          if (component && component.parentNode) {
            component.parentNode.removeChild(component);
          }
          component = null;
        },
      };
    },
  };
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  mode = 'full',
  editable = true,
  members = [],
  onSubmit,
}: RichTextEditorProps) {
  const isInitialMount = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CodeBlockLowlight.configure({ lowlight }),
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: createMentionSuggestion(members),
        renderText: ({ node }) => `@${node.attrs.label || node.attrs.id}`,
        renderHTML: ({ options, node }) => [
          'span',
          { ...options.HTMLAttributes, 'data-type': 'mention', 'data-id': node.attrs.id, 'data-label': node.attrs.label },
          `@${node.attrs.label || node.attrs.id}`,
        ],
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && onSubmit) {
          event.preventDefault();
          onSubmit();
          return true;
        }
        return false;
      },
      attributes: {
        class: 'text-sm text-surface-200',
      },
    },
  });

  // Update editor content when prop changes externally
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  // Update mention suggestions when members change
  useEffect(() => {
    if (editor && members.length > 0) {
      // The mention extension's suggestion items will pick up the latest members
      // via closure, so we re-configure if needed.
    }
  }, [editor, members]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        'tiptap-editor rounded-lg border border-surface-700 bg-surface-900 focus-within:ring-1 focus-within:ring-primary-500',
        mode === 'compact' && 'compact',
      )}
      style={mode === 'full' ? { resize: 'vertical', overflow: 'hidden', minHeight: '140px' } : undefined}
    >
      {editable && <Toolbar editor={editor} mode={mode} />}
      <EditorContent editor={editor} />
    </div>
  );
}
