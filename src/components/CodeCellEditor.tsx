import { FunctionComponent, useCallback, useEffect, useRef } from 'react';
import { ImmutableCodeCell, ImmutableOutput } from '@nteract/commutable';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface CodeCellEditorProps {
  cell: ImmutableCodeCell;
  onChange: (cell: ImmutableCodeCell) => void;
  onActivate: () => void;
  onShiftEnter: () => void;
  onCtrlEnter: () => void;
}

const CodeCellEditor: FunctionComponent<CodeCellEditorProps> = ({ cell, onChange, onActivate, onShiftEnter, onCtrlEnter }) => {
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      const newCell = cell.set('source', value);
      onChange(newCell);
    }
  };

  const onShiftEnterRef = useRef(onShiftEnter);
  const onCtrlEnterRef = useRef(onCtrlEnter);

  useEffect(() => {
    onShiftEnterRef.current = onShiftEnter;
    onCtrlEnterRef.current = onCtrlEnter;
  }, [onShiftEnter, onCtrlEnter]);

  const handleEditorMount: OnMount = useCallback((editor) => {
    // we need to disable the default behavior of the editor for the following key commands:
    // - Shift + Enter
    // - Ctrl + Enter
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      onShiftEnterRef.current();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onCtrlEnterRef.current();
    }
    );

    editor.onKeyDown((event) => {
      // do not propagate special key events such as "a" and "b"
      if (event.keyCode === monaco.KeyCode.Enter) {
        // but we do need to propagate Enter key events which are handled in the above commands
        return;
      }
      event.stopPropagation();
    });
  }, []);

  return (
    <div
      style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
      onClick={() => onActivate()}
    >
      <Editor
        height={`${Math.max(1, (cell.get('source').split('\n').length)) * 20}px`}
        defaultLanguage="python"
        value={cell.get('source')}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'off',
          lineDecorationsWidth: 0,
          folding: false,
          fontSize: 14,
          renderLineHighlight: 'none'
        }}
        onMount={handleEditorMount}
      />
      {cell.outputs.size > 0 && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#f5f5f5',
          borderRadius: 4,
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          fontSize: 13
        }}>
          {cell.outputs.map((output: ImmutableOutput, index: number) => {
            if (output.output_type === 'stream') {
              return <div key={index}>{output.text}</div>;
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};

export default CodeCellEditor;
