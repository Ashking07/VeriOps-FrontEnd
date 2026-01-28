import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";

type RunbookEditorProps = {
  value: string;
  onChange: (value: string) => void;
  theme: "dark" | "light";
};

export const RunbookEditor: React.FC<RunbookEditorProps> = ({ value, onChange, theme }) => {
  return (
    <div className="border rounded-xl overflow-hidden">
      <CodeMirror
        value={value}
        height="260px"
        extensions={[yaml()]}
        basicSetup={{ lineNumbers: true }}
        theme={theme === "dark" ? "dark" : "light"}
        onChange={(nextValue) => onChange(nextValue)}
      />
    </div>
  );
};
