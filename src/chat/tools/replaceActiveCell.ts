/* eslint-disable @typescript-eslint/no-explicit-any */
import { ORFunctionDescription } from "../../pages/HomePage/openRouterTypes";

export const toolFunction: ORFunctionDescription = {
  name: "replace_active_cell",
  description:
    "Replace the content of the active cell, which could be a code cell or a markdown cell",
  parameters: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The content to replace the active cell with",
      },
      language: {
        type: "string",
        description:
          "The language of the content. Should be python or markdown. Lowercase.",
      },
    },
  },
};

type ReplaceActiveCellParams = {
  content: string;
};

export const execute = async (
  params: ReplaceActiveCellParams,
  o: any,
): Promise<string> => {
  const { content } = params;

  o.replaceActiveCell(content);
  return "Active cell replaced";
};

export const detailedDescription = `
This tool allows you to replace the contents of the active cell in the Jupyter notebook. The active cell could be a code cell or a markdown cell. Set the language as appropriate.
`;

export const requiresPermission = true;
