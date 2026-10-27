import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting, type LanguageSupport } from '@codemirror/language'
import { Compartment, EditorState, RangeSetBuilder } from '@codemirror/state'
import { Decoration, EditorView, highlightActiveLine, keymap, lineNumbers, placeholder as placeholderText } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { useEffect, useRef } from 'react'
import './CodeEditor.css'

// Same colors as GitHub's dark theme, which the portfolio palette comes from
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.operatorKeyword, tags.definitionKeyword], color: '#ff7b72' },
  { tag: [tags.string, tags.special(tags.string)], color: '#a5d6ff' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: '#79c0ff' },
  { tag: [tags.propertyName], color: '#7ee787' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: '#ffa657' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: '#d2a8ff' },
  { tag: [tags.meta, tags.annotation], color: '#d2a8ff' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: '#8b949e', fontStyle: 'italic' },
])

const theme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'var(--page-bg)', color: 'var(--text)', fontSize: '13px' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.6' },
    '.cm-content': { caretColor: 'var(--accent)' },
    '.cm-gutters': { backgroundColor: 'var(--page-bg)', color: 'var(--muted)', border: 'none' },
    '.cm-activeLine': { backgroundColor: 'rgba(110, 118, 129, 0.1)' },
    '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--accent)' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(56, 139, 253, 0.35)',
    },
    '.cm-matchingBracket': { backgroundColor: 'rgba(63, 185, 80, 0.25)', outline: 'none' },
    '.cm-placeholder': { color: 'var(--muted)' },
    '.cm-errorLine': { backgroundColor: 'rgba(248, 81, 73, 0.15)' },
  },
  { dark: true },
)

function errorLineDecoration(line: number | null) {
  return EditorView.decorations.compute(['doc'], (state) => {
    const builder = new RangeSetBuilder<Decoration>()
    if (line !== null && line <= state.doc.lines) {
      builder.add(state.doc.line(line).from, state.doc.line(line).from, Decoration.line({ class: 'cm-errorLine' }))
    }
    return builder.finish()
  })
}

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  /** null while the highlighting is loading */
  language: LanguageSupport | null
  readOnly?: boolean
  label: string
  placeholder?: string
  /** 1-based line to highlight as wrong */
  errorLine?: number | null
}

/** CodeMirror editor. Text typed here is only kept in memory. */
export function CodeEditor({ value, onChange, language, readOnly = false, label, placeholder = '', errorLine = null }: CodeEditorProps) {
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const compartments = useRef({
    language: new Compartment(),
    readOnly: new Compartment(),
    errorLine: new Compartment(),
    texts: new Compartment(),
  })

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Created once; the props are applied below by reconfiguring it
  useEffect(() => {
    const slots = compartments.current
    const editor = new EditorView({
      parent: container.current!,
      state: EditorState.create({
        doc: '',
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          bracketMatching(),
          indentOnInput(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          syntaxHighlighting(highlight),
          theme,
          slots.language.of([]),
          slots.readOnly.of([]),
          slots.errorLine.of([]),
          slots.texts.of([]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current?.(update.state.doc.toString())
          }),
        ],
      }),
    })
    view.current = editor
    return () => {
      editor.destroy()
      view.current = null
    }
  }, [])

  useEffect(() => {
    view.current?.dispatch({ effects: compartments.current.language.reconfigure(language ?? []) })
  }, [language])

  useEffect(() => {
    view.current?.dispatch({ effects: compartments.current.readOnly.reconfigure(EditorState.readOnly.of(readOnly)) })
  }, [readOnly])

  // Change with the interface language
  useEffect(() => {
    const texts = [EditorView.contentAttributes.of({ 'aria-label': label }), placeholderText(placeholder)]
    view.current?.dispatch({ effects: compartments.current.texts.reconfigure(texts) })
  }, [label, placeholder])

  useEffect(() => {
    view.current?.dispatch({ effects: compartments.current.errorLine.reconfigure(errorLineDecoration(errorLine)) })
  }, [errorLine])

  // Only replaces the text when it comes from outside (an example, the generated code), not while typing
  useEffect(() => {
    const editor = view.current
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } })
    }
  }, [value])

  return <div ref={container} className="code-editor" />
}
