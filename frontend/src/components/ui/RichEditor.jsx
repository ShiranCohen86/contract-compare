import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import './RichEditor.scss';

const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
  }),
  Underline,
];

function ToolbarBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      className={`rich-toolbar__btn${active ? ' rich-toolbar__btn--active' : ''}`}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
    >
      {children}
    </button>
  );
}

export default function RichEditor({ value, onChange, placeholder }) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value || '',
    editorProps: {
      attributes: {
        class: 'rich-editor__content',
        dir: 'rtl',
      },
    },
    onUpdate({ editor: e }) {
      onChange(e.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="rich-editor">
      <div className="rich-toolbar">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="מודגש">𝐁</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="נטוי"><em>I</em></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="קו תחתון"><u>U</u></ToolbarBtn>
        <span className="rich-toolbar__sep" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="כותרת">H2</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="כותרת קטנה">H3</ToolbarBtn>
        <span className="rich-toolbar__sep" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="רשימה">• ≡</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="רשימה ממוספרת">1. ≡</ToolbarBtn>
        <span className="rich-toolbar__sep" />
        <ToolbarBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="נקה עיצוב">✕</ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
      {!editor.getText() && placeholder && (
        <div className="rich-editor__placeholder">{placeholder}</div>
      )}
    </div>
  );
}
