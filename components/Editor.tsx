import nlp from 'compromise'
import isHotkey from 'is-hotkey'
import { useEffect, useMemo, useState } from 'react'
import { Node, createEditor, Path, Text, Transforms } from 'slate'
import { Slate, Editable, withReact, ReactEditor } from 'slate-react'
import { withHistory } from 'slate-history'

export default function Editor(): JSX.Element {
  const sampleText: Array<string> = [
    "This is good. But that is bad. And it's important that you know the difference.",
    '',
    "Another day, another paragraph. I can't wait for tomorrow!",
  ]
  const [value, setValue] = useState<Array<Node>>(
    sampleText.map((text) => ({ children: [{ text }] }))
  )

  const editor = useMemo(() => withHistory(withReact(createEditor())), [])
  useEffect(() => {
    // Autofocus at the end
    selectEndOfText(editor, value)
  }, [editor])

  return (
    <div
      style={{
        border: 'solid',
        borderColor: 'lightblue',
        width: '100%',
        height: '100%',
        padding: 10,
      }}
    >
      <Slate
        editor={editor}
        value={value}
        onChange={(value) => setValue(value)}
      >
        <Editable
          autoFocus={true}
          placeholder="Enter some plain text..."
          onKeyDown={async (e) => {
            // @ts-expect-error
            if (isHotkey("mod+'")(e)) {
              if (!editor.selection) {
                return
              }

              const focusedPath = editor.selection.focus.path
              const focusedNode = Node.get(editor, focusedPath)
              const focusedNodeText = focusedNode.text
              if (typeof focusedNodeText !== 'string') {
                // We can only rewrite plain text
                return
              }

              const spanToSelect = getSpanOfSentenceAtCursor(
                focusedNodeText,
                editor.selection.focus.offset
              )
              if (!spanToSelect) {
                return
              }

              Transforms.select(editor, {
                anchor: { path: focusedPath, offset: spanToSelect.start },
                focus: { path: focusedPath, offset: spanToSelect.end },
              })
            }
            // @ts-expect-error
            else if (isHotkey('mod+enter')(e)) {
              if (!editor.selection) {
                return
              }

              const focusedPath = editor.selection.focus.path
              const focusedNode = Node.get(editor, focusedPath)
              const focusedNodeText = focusedNode.text
              if (typeof focusedNodeText !== 'string') {
                // We can only rewrite plain text
                return
              }

              const sentenceSpan = getSpanOfSentenceAtCursor(
                focusedNodeText,
                editor.selection.focus.offset
              )
              if (!sentenceSpan) {
                return
              }

              if (
                sentenceSpan.start !== editor.selection.anchor.offset ||
                sentenceSpan.end !== editor.selection.focus.offset
              ) {
                // Current selection is not a sentence
                return
              }

              const originalSentence = focusedNodeText.slice(
                sentenceSpan.start,
                sentenceSpan.end
              )
              const newPrefix = window.prompt('New prefix')
              if (!newPrefix) {
                return
              }

              const rewrittenSentence = await requestSentenceRewrite({
                originalSentence,
                newPrefix,
              })

              Transforms.insertText(editor, rewrittenSentence)
            }
          }}
        />
      </Slate>
    </div>
  )
}

function selectEndOfText(editor: ReactEditor, nodes: Array<Node>): void {
  const lastTopLevelNode = nodes[nodes.length - 1]

  let textNode: Text
  let textNodePath: Path
  for (const [_textNode, _textNodePath] of Node.texts(lastTopLevelNode, {
    reverse: true,
  })) {
    textNode = _textNode
    textNodePath = _textNodePath
    // First generator result is the last node, so we're done
    break
  }

  const endPoint = {
    path: [nodes.length - 1, ...textNodePath],
    offset: textNode.text.length,
  }
  Transforms.select(editor, {
    anchor: endPoint,
    focus: endPoint,
  })
}

interface TextSpan {
  start: number
  end: number
}

export function getSpanOfSentenceAtCursor(
  text: string,
  cursorOffset: number
): TextSpan | null {
  const sentenceSpans: Array<TextSpan> = nlp
    .tokenize(text)
    .json({
      // https://observablehq.com/@spencermountain/compromise-json
      trim: true,
      offset: true,
    })
    .map(({ offset: { start, length } }) => ({
      start,
      end: start + length,
    }))

  if (sentenceSpans.length === 0) {
    return null
  }

  let selectedSpan: TextSpan
  for (const span of sentenceSpans) {
    // If the cursor is inside a sentence, choose that sentence.
    // Otherwise, choose the sentence that the cursor comes right before.
    if (span.end >= cursorOffset) {
      selectedSpan = span
      break
    }
  }
  if (!selectedSpan) {
    selectedSpan = sentenceSpans[sentenceSpans.length - 1]
  }

  return selectedSpan
}

async function requestSentenceRewrite({
  originalSentence,
  newPrefix,
}: {
  originalSentence: string
  newPrefix: string
}): Promise<string> {
  const response = await fetch(
    'https://sentence-rewriter.ngrok.io/rewrite-sentence',
    {
      method: 'POST',
      mode: 'cors',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalSentence,
        newPrefix,
      }),
    }
  )

  const responseJson = await response.json()
  return responseJson['rewrittenSentence']
}
